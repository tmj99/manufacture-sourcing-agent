import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { exa } from "./exa";
import { type Anchor } from "./schema";
import { type AgentData, type ShortlistEntry, type AgentTrace } from "./types";
import { buildQuery } from "./utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MODEL = "claude-haiku-4-5-20251001";

// ── Zod schema for synthesis output ─────────────────────────────────────────

// .catch() on every field so a null/wrong-type value from the model uses the
// fallback instead of throwing — the whole parse no longer fails on one bad field.
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text.trim();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ── Intermediate candidate shape ──────────────────────────────────────────────

interface RawCandidate {
  domain: string;
  title: string;
  url: string;
  highlights: string[];
  summary: string;
  score: number | null;
  matchedQueries: string[];
  verificationText: string;
  sourceUrls: string[];
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runSourcingAgent(anchor: Anchor): Promise<AgentData> {
  const fullQuery = buildQuery(anchor);

  // Step 5.1 — Spec decomposition
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
    const text =
      decomp.content[0].type === "text" ? decomp.content[0].text : "";
    subQueries = (JSON.parse(extractJson(text)).queries as string[]).slice(0, 5);
  } catch {
    subQueries = [fullQuery];
  }

  // Hard-anchor geography into every sub-query so the Exa fan-out is geographically
  // constrained at retrieval time. Haiku reliably omits this without explicit enforcement.
  if (anchor.geography?.trim()) {
    subQueries = subQueries.map((q) => `${q} in ${anchor.geography}`);
  }

  // Step 5.2 — Fan-out search
  const fanOut = await Promise.all(
    subQueries.map(async (subQuery) => {
      try {
        const resp = await exa.search(subQuery, {
          type: "neural",
          numResults: 6,
          contents: {
            highlights: {
              query: `capability and certification evidence for: ${subQuery}`,
              numSentences: 2,
            },
            summary: {
              query:
                "What capabilities, certifications, and geographic location does this supplier have?",
            },
          },
        });
        return { subQuery, results: resp.results };
      } catch {
        return { subQuery, results: [] as { url: string; title?: string; score?: number; publishedDate?: string }[] };
      }
    })
  );

  const totalRetrieved = fanOut.reduce((n, { results }) => n + results.length, 0);

  // Step 5.3 — Dedup by domain
  const byDomain = new Map<string, RawCandidate>();
  for (const { subQuery, results } of fanOut) {
    for (const r of results) {
      const domain = domainOf(r.url);
      const raw = r as Record<string, unknown>;
      const rHl = Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [];
      const rSu = typeof raw.summary === "string" ? raw.summary : "";

      if (byDomain.has(domain)) {
        const c = byDomain.get(domain)!;
        if (!c.matchedQueries.includes(subQuery)) c.matchedQueries.push(subQuery);
        if (rHl.length > c.highlights.length) {
          c.highlights = rHl;
          c.summary = rSu;
        }
        if (!c.sourceUrls.includes(r.url)) c.sourceUrls.push(r.url);
      } else {
        byDomain.set(domain, {
          domain,
          title: r.title ?? "",
          url: r.url,
          highlights: rHl,
          summary: rSu,
          score: r.score ?? null,
          matchedQueries: [subQuery],
          verificationText: "",
          sourceUrls: [r.url],
        });
      }
    }
  }

  const deduped = Array.from(byDomain.values()).sort(
    (a, b) =>
      b.matchedQueries.length - a.matchedQueries.length ||
      (b.score ?? 0) - (a.score ?? 0)
  );

  const top = deduped.slice(0, 6);

  // Step 5.4 — Per-candidate verification
  await Promise.all(
    top.map(async (c) => {
      const vq = `What capabilities, certifications, capacity, and customer references does ${c.title || c.domain} evidence on its own site for: ${anchor.spec}`;
      try {
        let resp = await exa.search(vq, {
          type: "neural",
          numResults: 3,
          includeDomains: [c.domain],
          contents: {
            highlights: {
              query: "certifications, capacity, customer references, recent work",
              numSentences: 2,
            },
            text: { maxCharacters: 600 },
          },
        });
        // Fallback: unscoped if the domain isn't indexed
        if (resp.results.length === 0) {
          resp = await exa.search(
            `${c.title || c.domain} certifications customers capabilities`,
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
        const parts: string[] = [];
        for (const r of resp.results) {
          const raw = r as Record<string, unknown>;
          const hl = Array.isArray(raw.highlights)
            ? (raw.highlights as string[]).join(" | ")
            : "";
          const tx =
            typeof raw.text === "string" ? raw.text.slice(0, 300) : "";
          if (hl) parts.push(`Highlight: ${hl}`);
          if (tx) parts.push(`Text: ${tx}`);
          if (!c.sourceUrls.includes(r.url)) c.sourceUrls.push(r.url);
        }
        c.verificationText = parts.join("\n");
      } catch {
        c.verificationText = "";
      }
    })
  );

  // Step 5.5 — Structured synthesis
  const trace: AgentTrace = {
    subQueriesFired: subQueries,
    totalCandidatesRetrieved: totalRetrieved,
    dedupedCandidates: deduped.length,
    verificationPasses: top.length,
  };

  const candidateBlocks = top
    .map(
      (c, i) => `[Candidate ${i + 1}]
Domain: ${c.domain}
Title: ${c.title}
Sub-queries matched: ${c.matchedQueries.join(" | ")}
Discovery highlights: ${c.highlights.join(" | ")}
Discovery summary: ${c.summary}
Verification evidence: ${c.verificationText || "none returned"}
Source URLs: ${c.sourceUrls.join(", ")}`
    )
    .join("\n\n");

  const geoRequirement = anchor.geography?.trim() || "any";

  const systemPrompt = `You are a structured-data extractor for a strategic sourcing agent. Synthesize supplier evidence into a shortlist.

RULES (non-negotiable):
- Use ONLY the retrieved content. Never add prior knowledge.
- Every item in certificationsFound, customerReferencesFound, capabilitiesMatched must appear in the provided evidence.
- GEOGRAPHY GATE (highest priority): Required geography is "${geoRequirement}".
  * If a candidate's location is confirmed OUTSIDE this geography → matchConfidence MUST be "low". List "Geographic requirement not met: [location] is outside ${geoRequirement}" as the FIRST gap.
  * If a candidate's location is unknown/unconfirmed → matchConfidence is "moderate" at most. List "Location unconfirmed; verify geography before shortlisting" as the first gap.
  * Only candidates with confirmed location IN ${geoRequirement} may receive "high" or "moderate" confidence.
- matchConfidence (after geography gate passes): "high" = ≥3 sub-queries matched AND ≥1 certification evidenced; "moderate" = 2 sub-queries matched OR certifications claimed but not directly evidenced; "low" = all other cases.
- gaps: list what the analyst must still verify (e.g. "capacity not stated; needs RFI").
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
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: retry
              ? `${userPrompt}\n\nReturn valid JSON only. No markdown, no explanation.`
              : userPrompt,
          },
          // Prefill the assistant turn — forces the model to start directly with JSON
          // and eliminates any preamble that would break JSON.parse.
          { role: "assistant", content: '{"shortlist":[' },
        ],
      });
      const completion =
        msg.content[0].type === "text" ? msg.content[0].text : "";
      // Reconstruct the full JSON by prepending the prefill we sent.
      const fullText = '{"shortlist":[' + completion;
      const parsed = JSON.parse(fullText);
      // Accept both { shortlist: [...] } and [...] in case the model closed early.
      const arr: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.shortlist)
        ? parsed.shortlist
        : null!;
      if (!arr) return null;
      return shortlistSchema.parse({ shortlist: arr }).shortlist;
    } catch (err) {
      console.error(`[agent] synthesize(retry=${retry}) failed:`, err);
      return null;
    }
  }

  let shortlist = await synthesize(false);
  if (!shortlist) shortlist = await synthesize(true);

  if (!shortlist) {
    return {
      shortlist: top.map((c) => ({
        supplierName: c.title || c.domain,
        primaryDomain: c.domain,
        headquartersGuess: "",
        capabilitiesMatched: c.matchedQueries,
        certificationsFound: [],
        customerReferencesFound: [],
        languageOfEvidence: "",
        sourceUrls: c.sourceUrls,
        matchConfidence: "low" as const,
        gaps: ["Synthesis step failed — showing raw candidates. Review manually."],
      })),
      agentTrace: trace,
      degraded: true,
    };
  }

  return { shortlist, agentTrace: trace };
}
