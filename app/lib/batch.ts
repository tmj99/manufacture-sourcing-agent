import { runExaRaw } from "./exa";
import { type Anchor } from "./schema";
import { type BatchCandidate, type BatchSpecResult } from "./types";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function runSingleSpec(anchor: Anchor): Promise<BatchSpecResult> {
  try {
    const data = await runExaRaw(anchor);
    const candidates: BatchCandidate[] = data.results.map((r) => ({
      name: r.title,
      url: r.url,
      domain: domainOf(r.url),
      location: r.language, // TLD-based tag (e.g. "MX", "CZ") or ""
      description: r.summary || r.highlights[0] || "",
    }));
    return {
      spec: anchor.spec,
      geography: anchor.geography ?? "",
      websetId: "",
      status: "completed",
      candidates,
    };
  } catch (err) {
    return {
      spec: anchor.spec,
      geography: anchor.geography ?? "",
      websetId: "",
      status: "error",
      candidates: [],
      error: String(err),
    };
  }
}

export async function runBatch(anchors: Anchor[]): Promise<BatchSpecResult[]> {
  return Promise.all(anchors.slice(0, 5).map(runSingleSpec));
}
