import { type Anchor } from "./schema";

/** Builds the full natural-language query from an anchor. Both pipelines use this. */
export function buildQuery(anchor: Anchor): string {
  const parts = [anchor.spec.trim()];
  if (anchor.geography?.trim()) parts.push(`in ${anchor.geography.trim()}`);
  if (anchor.certifications?.trim())
    parts.push(`with ${anchor.certifications.trim()} certification`);
  if (anchor.volumeRange?.trim())
    parts.push(`capable of ${anchor.volumeRange.trim()}`);
  return parts.join(", ");
}

const NON_ENGLISH_TLDS = new Set([
  "mx", "cz", "tr", "in", "cn", "vn", "id", "pl", "hu",
  "sk", "ro", "bg", "hr", "rs", "th", "my", "ph", "kr", "jp",
]);

/** TLD-based language hint. Returns a 2-letter tag or empty string. */
export function languageTag(url: string, title = ""): string {
  try {
    const tld = new URL(url).hostname.toLowerCase().replace(/^www\./, "").split(".").pop() ?? "";
    if (NON_ENGLISH_TLDS.has(tld)) return tld.toUpperCase();
  } catch {
    // ignore
  }
  if (title && /[^\x00-\x7F]/.test(title)) return "non-ASCII";
  return "";
}

// Maps geography label tokens (lowercase) to the uppercase TLD codes
// produced by languageTag(). Used in both BatchPanel and the Excel exporter.
export const GEO_TLD_MAP: Record<string, string[]> = {
  mexico: ["MX"],
  "eastern europe": ["CZ", "PL", "HU", "SK", "RO", "BG", "HR", "RS"],
  turkey: ["TR"],
  india: ["IN"],
  china: ["CN"],
  "southeast asia": ["VN", "ID", "TH", "MY", "PH"],
  "south korea": ["KR"],
  japan: ["JP"],
};

/** Returns true when a TLD-based location tag confirms membership in the geography string. */
export function geoMatch(location: string, geography: string): boolean {
  if (!location || !geography) return false;
  const loc = location.toUpperCase().trim();
  const tokens = geography.toLowerCase().split(",").map((t) => t.trim());
  for (const token of tokens) {
    const codes = GEO_TLD_MAP[token];
    if (codes && codes.includes(loc)) return true;
    if (token.toUpperCase() === loc) return true;
  }
  return false;
}
