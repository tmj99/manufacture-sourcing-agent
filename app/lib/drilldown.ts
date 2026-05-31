import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { exa } from "./exa";
import { type Anchor } from "./schema";
import { type AgentData, type ShortlistEntry, type AgentTrace } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const MODEL = "claude-haiku-4-5-20251001";

const shortlistEntrySchema = z.object({
  supplierName: z.string().catch(""),
  primaryDomain: z.string().catch(""),
  headquartersGuess: z.string().catch(""),
  capabilitiesMatched: z.array(z.string()).catch([]),
  certificationsFound: z.array(z.string()).catch([]),
  customerReferencesFound: z.array(z.string()).catch([]),
  languageOfEvidence: z.string().catch(""),
  sourceUrls: z.array(z.string()).catch([]),
  matchConfidence: z.enum(["high", "moderate", "low"]).catch("low"),
  gaps: z.array(z.string()).catch([]),
});

const shortlistSchema = z.object({ shortlist: z.array(shortlistEntrySchema) });

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text.trim();
}

export interface DrilldownCandidate {
  name: string;
  domain: string;
  url: string;
}

export async function runDrilldown(
  anchor: Anchor,
  candidates: DrilldownCandidate[]
): Promise<AgentData> {
  // Step D1 — Spec decomposition
  let subQueries: string[];
  try {
    const decomp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system:
        'You decompose a sourcing spec into independent capability sub-queries for semantic web search. Each targets one capability dimension. Return JSON only — no markdown, no explanation: { "queries": string[] }',
      messages: [
        {
          role: "user",
          content: `Spec: ${anchor.spec}\nGeography: ${anchor.geography || "any"}\nCertifications: ${anchor.certifications || "any"}\nVolume: ${anchor.volumeRange || "not specified"}\n\nReturn 3–5 sub-queries.`,
        },
      ],
    });
    const text = decomp.content[0].type === "text" ? decomp.content[0].text : "";
    subQueries = (JSON.parse(extractJson(text)).queries as string[]).slice(0, 5);
  } catch {
    subQueries = [`${anchor.spec}${anchor.geography ? ` in ${anchor.geography}` : ""}`];
  }

  if (anchor.geography?.trim()) {
    subQueries = subQueries.map((q) => `${q} in ${anchor.geography}`);
  }

  // Step D2 — Per-candidate verification (scoped to each company's domain)
  interface CandidateEvidence {
    candidate: DrilldownCandidate;
    sourceUrls: string[];
    verificationText: string;
  }

  const evidences: CandidateEvidence[] = await Promise.all(
    candidates.map(async (c) => {
      const sourceUrls: string[] = c.url ? [c.url] : [];
      const parts: string[] = [];

      await Promise.all(
        subQueries.map(async (subQuery) => {
          try {
            let resp = await exa.search(subQuery, {
              type: "neural",
              numResults: 3,
              includeDomains: [c.domain],
              contents: {
                highlights: {
                  query: `certifications, capacity, capability match for: ${subQuery}`,
                  numSentences: 2,
                },
                text: { maxCharacters: 500 },
              },
            });
            // Fallback: unscoped if domain not indexed
            if (resp.results.length === 0) {
              resp = await exa.search(
                `${c.name || c.domain} certifications customers capabilities ${anchor.spec}`,
                {
                  type: "neural",
                  numResults: 2,
                  contents: {
                    highlights: {
                      query: "certifications, capacity, customer references",
                      numSentences: 2,
                    },
                  },
                }
              );
            }
            for (const r of resp.results) {
              if (!sourceUrls.includes(r.url)) sourceUrls.push(r.url);
              const raw = r as Record<string, unknown>;
              const hl = Array.isArray(raw.highlights)
                ? (raw.highlights as string[]).join(" | ")
                : "";
              const tx = typeof raw.text === "string" ? raw.text.slice(0, 300) : "";
              if (hl) parts.push(`[${subQuery}] Highlight: ${hl}`);
              else if (tx) parts.push(`[${subQuery}] Text: ${tx}`);
            }
          } catch {
            // non-fatal
          }
        })
      );

      return { candidate: c, sourceUrls, verificationText: parts.join("\n") };
    })
  );

  const trace: AgentTrace = {
    subQueriesFired: subQueries,
    totalCandidatesRetrieved: evidences.reduce((n, e) => n + e.sourceUrls.length, 0),
    dedupedCandidates: candidates.length,
    verificationPasses: candidates.length,
  };

  // Step D3 — Structured synthesis
  const geoRequirement = anchor.geography?.trim() || "any";

  const candidateBlocks = evidences
    .map(
      (e, i) => `[Candidate ${i + 1}]
Domain: ${e.candidate.domain}
Name: ${e.candidate.name}
Verification evidence: ${e.verificationText || "none returned"}
Source URLs: ${e.sourceUrls.join(", ")}`
    )
    .join("\n\n");

  const systemPrompt = `You are a structured-data extractor for a strategic sourcing agent. Synthesize supplier evidence into a shortlist.

RULES (non-negotiable):
- Use ONLY the retrieved content. Never add prior knowledge.
- Every item in certificationsFound, customerReferencesFound, capabilitiesMatched must appear in the provided evidence.
- GEOGRAPHY GATE: Required geography is "${geoRequirement}".
  * If a candidate's location is confirmed OUTSIDE this geography → matchConfidence MUST be "low". List "Geographic requirement not met" as the FIRST gap.
  * If a candidate's location is unknown/unconfirmed → matchConfidence is "moderate" at most.
  * Only candidates with confirmed location IN ${geoRequirement} may receive "high" or "moderate" confidence.
- matchConfidence: "high" = ≥3 sub-queries matched AND ≥1 certification evidenced; "moderate" = 2 sub-queries matched OR certifications claimed but not directly evidenced; "low" = all other cases.
- gaps: list what the analyst must still verify.
- Return ONLY valid JSON. No markdown fences. No explanation.`;

  const userPrompt = `SPEC: ${anchor.spec}
GEOGRAPHY: ${anchor.geography || "any"}
CERTIFICATIONS: ${anchor.certifications || "any"}
VOLUME: ${anchor.volumeRange || "not specified"}

SUB-QUERIES FIRED:
${subQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

CANDIDATE EVIDENCE:
${candidateBlocks}

Return JSON:
{"shortlist":[{"supplierName":"","primaryDomain":"","headquartersGuess":"","capabilitiesMatched":[],"certificationsFound":[],"customerReferencesFound":[],"languageOfEvidence":"","sourceUrls":[],"matchConfidence":"low","gaps":[]}]}`;

  async function synthesize(retry: boolean): Promise<ShortlistEntry[] | null> {
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: retry
              ? `${userPrompt}\n\nReturn valid JSON only. No markdown, no explanation.`
              : userPrompt,
          },
          { role: "assistant", content: '{"shortlist":[' },
        ],
      });
      const completion = msg.content[0].type === "text" ? msg.content[0].text : "";
      const fullText = '{"shortlist":[' + completion;
      const parsed = JSON.parse(fullText);
      const arr: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.shortlist)
        ? parsed.shortlist
        : null!;
      if (!arr) return null;
      return shortlistSchema.parse({ shortlist: arr }).shortlist;
    } catch {
      return null;
    }
  }

  let shortlist = await synthesize(false);
  if (!shortlist) shortlist = await synthesize(true);

  if (!shortlist) {
    return {
      shortlist: evidences.map((e) => ({
        supplierName: e.candidate.name || e.candidate.domain,
        primaryDomain: e.candidate.domain,
        headquartersGuess: "",
        capabilitiesMatched: [],
        certificationsFound: [],
        customerReferencesFound: [],
        languageOfEvidence: "",
        sourceUrls: e.sourceUrls,
        matchConfidence: "low" as const,
        gaps: ["Synthesis step failed — review evidence manually."],
      })),
      agentTrace: trace,
      degraded: true,
    };
  }

  return { shortlist, agentTrace: trace };
}
