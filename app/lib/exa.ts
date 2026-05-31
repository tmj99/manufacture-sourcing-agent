import Exa from "exa-js";
import { type Anchor } from "./schema";
import { type ExaRawData, type ExaResult } from "./types";
import { buildQuery, languageTag } from "./utils";

export const exa = new Exa(process.env.EXA_API_KEY!);

export async function runExaRaw(anchor: Anchor): Promise<ExaRawData> {
  const query = buildQuery(anchor);
  const excludeDomains =
    anchor.excludeDomains
      ?.split(",")
      .map((d) => d.trim())
      .filter(Boolean) ?? [];

  try {
    const response = await exa.search(query, {
      type: "neural",
      numResults: 10,
      ...(excludeDomains.length > 0 ? { excludeDomains } : {}),
      contents: {
        text: { maxCharacters: 1200 },
        highlights: {
          query: `capability, certification, capacity match for: ${query}`,
          numSentences: 3,
        },
        summary: {
          query:
            "Does this supplier match the spec? What capabilities, certifications, and geographic reach are evidenced?",
        },
      },
    });

    const results: ExaResult[] = response.results.map((r) => {
      // The SDK types highlights/summary conditionally; access via any to stay simple.
      const raw = r as Record<string, unknown>;
      const highlights = Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [];
      const summary = typeof raw.summary === "string" ? raw.summary : "";
      return {
        title: r.title ?? "",
        url: r.url,
        publishedDate: r.publishedDate ?? "",
        highlights,
        summary,
        score: r.score ?? null,
        language: languageTag(r.url, r.title ?? ""),
      };
    });

    return { query, results };
  } catch (err) {
    return { query, results: [], error: String(err) };
  }
}
