// Shared result types across all three pipelines.

export interface GoogleResult {
  title: string;
  url: string;
  snippet: string;
  inTargetGeo: boolean;
}

export interface GoogleData {
  query: string;
  results: GoogleResult[];
  error?: string;
}

export interface ExaResult {
  title: string;
  url: string;
  publishedDate: string;
  highlights: string[];
  summary: string;
  score: number | null;
  language: string; // TLD-based tag, e.g. "MX", "CZ", or ""
}

export interface ExaRawData {
  query: string;
  results: ExaResult[];
  error?: string;
}

export interface ShortlistEntry {
  supplierName: string;
  primaryDomain: string;
  headquartersGuess: string;
  capabilitiesMatched: string[];
  certificationsFound: string[];
  customerReferencesFound: string[];
  languageOfEvidence: string;
  sourceUrls: string[];
  matchConfidence: "high" | "moderate" | "low";
  gaps: string[];
}

export interface AgentTrace {
  subQueriesFired: string[];
  totalCandidatesRetrieved: number;
  dedupedCandidates: number;
  verificationPasses: number;
}

export interface AgentData {
  shortlist: ShortlistEntry[];
  agentTrace: AgentTrace;
  error?: string;
  degraded?: boolean;
}

export interface SourceResponse {
  google: GoogleData;
  exa_raw: ExaRawData | null;
  agent: AgentData | null;
}

// ── Batch mode (Phase 10) ─────────────────────────────────────────────────────

export interface BatchCandidate {
  name: string;
  url: string;
  domain: string;
  location: string;
  description: string; // Websets' relevance note for this company
}

export interface BatchSpecResult {
  spec: string;
  geography: string;
  websetId: string;
  status: "completed" | "timeout" | "error";
  candidates: BatchCandidate[];
  error?: string;
}

export interface BatchResponse {
  results: BatchSpecResult[];
}
