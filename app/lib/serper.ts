import { type Anchor } from "./schema";
import { type GoogleData, type GoogleResult } from "./types";
import { buildQuery } from "./utils";

// Maps geography keywords → country-code TLDs for that region.
const GEO_TLD_MAP: Record<string, string[]> = {
  mexico: ["mx"],
  "eastern europe": ["cz", "pl", "hu", "ro", "sk", "bg", "hr", "rs", "si", "lt", "lv", "ee", "ua"],
  "southeast asia": ["vn", "id", "th", "my", "ph", "sg", "kh", "la", "mm"],
  india: ["in"],
  turkey: ["tr"],
  china: ["cn"],
  germany: ["de"],
  france: ["fr"],
  spain: ["es"],
  italy: ["it"],
  brazil: ["br"],
};

function targetTlds(geography: string): Set<string> {
  const tlds = new Set<string>();
  const terms = geography
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const term of terms) {
    for (const [key, vals] of Object.entries(GEO_TLD_MAP)) {
      if (term.includes(key) || key.includes(term)) {
        vals.forEach((t) => tlds.add(t));
      }
    }
  }
  return tlds;
}

function domainTld(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host.split(".").pop() ?? "";
  } catch {
    return "";
  }
}

function inTargetGeo(url: string, tlds: Set<string>, geography: string): boolean {
  if (tlds.size === 0) return true; // no geography constraint → no badge
  if (tlds.has(domainTld(url))) return true;
  // Secondary: geography keywords in the URL (e.g. "mexico" in subdomain)
  const urlLower = url.toLowerCase();
  const terms = geography
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return terms.some((t) => urlLower.includes(t.replace(/\s+/g, "")));
}

export async function runGoogle(anchor: Anchor): Promise<GoogleData> {
  const query = buildQuery(anchor);
  try {
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!resp.ok) throw new Error(`Serper ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const tlds = targetTlds(anchor.geography ?? "");
    const results: GoogleResult[] = (data.organic ?? []).map(
      (r: { title?: string; link?: string; snippet?: string }) => ({
        title: r.title ?? "",
        url: r.link ?? "",
        snippet: r.snippet ?? "",
        inTargetGeo: inTargetGeo(r.link ?? "", tlds, anchor.geography ?? ""),
      })
    );
    return { query, results };
  } catch (err) {
    return { query, results: [], error: String(err) };
  }
}
