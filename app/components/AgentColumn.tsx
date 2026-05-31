"use client";

import { useState } from "react";
import { type AgentData, type ShortlistEntry } from "@/app/lib/types";

interface Props {
  data: AgentData;
}

const CONFIDENCE: Record<string, string> = {
  high: "bg-green-950 text-green-400",
  moderate: "bg-amber-950 text-amber-400",
  low: "bg-red-950 text-red-400",
};

export function SupplierCard({ entry }: { entry: ShortlistEntry }) {
  return (
    <div className="flex flex-col gap-2.5 border border-zinc-700 bg-zinc-800 p-4">
      {/* Name + confidence */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{entry.supplierName}</p>
          <a
            href={`https://${entry.primaryDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-blue-400 hover:underline"
          >
            {entry.primaryDomain}
          </a>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`px-2 py-0.5 text-xs font-semibold ${CONFIDENCE[entry.matchConfidence] ?? CONFIDENCE.low}`}>
            {entry.matchConfidence}
          </span>
          {entry.languageOfEvidence && entry.languageOfEvidence !== "English" && (
            <span className="bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-400">
              {entry.languageOfEvidence}
            </span>
          )}
        </div>
      </div>

      {/* HQ */}
      {entry.headquartersGuess && (
        <p className="text-xs text-zinc-500">📍 {entry.headquartersGuess}</p>
      )}

      {/* Capabilities */}
      {entry.capabilitiesMatched.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-500">Capabilities matched</p>
          <div className="flex flex-wrap gap-1">
            {entry.capabilitiesMatched.map((c, i) => (
              <span key={i} className="bg-blue-950 px-2 py-0.5 text-xs text-blue-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {entry.certificationsFound.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-500">Certifications evidenced</p>
          <div className="flex flex-wrap gap-1">
            {entry.certificationsFound.map((c, i) => (
              <span key={i} className="bg-green-950 px-2 py-0.5 text-xs font-semibold text-green-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Customer references */}
      {entry.customerReferencesFound.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-zinc-500">Customer references</p>
          <div className="flex flex-wrap gap-1">
            {entry.customerReferencesFound.map((r, i) => (
              <span key={i} className="bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {entry.sourceUrls.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-zinc-500">Sources</p>
          {entry.sourceUrls.slice(0, 3).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-xs text-blue-400 hover:underline"
            >
              {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 65)}
            </a>
          ))}
        </div>
      )}

      {/* Gaps */}
      {entry.gaps.length > 0 && (
        <div className="flex flex-col gap-0.5 border border-zinc-700 bg-zinc-900 px-2.5 py-2">
          <p className="text-xs font-medium text-zinc-500">Gaps · next analyst steps</p>
          {entry.gaps.map((g, i) => (
            <p key={i} className="text-xs text-zinc-600">⚠ {g}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentColumn({ data }: Props) {
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-purple-400">Exa sourcing agent</h2>
          <span className="bg-purple-950 px-2 py-0.5 text-xs font-medium text-purple-400">
            {data.shortlist.length} candidates
          </span>
        </div>
        <p className="text-xs text-zinc-600">Decomposes → searches → verifies → synthesizes</p>
      </div>

      {data.degraded && (
        <div className="border border-amber-900 bg-amber-950 px-3 py-2 text-xs text-amber-400">
          Synthesis step failed — showing raw candidates.
        </div>
      )}
      {data.error && (
        <div className="border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
          {data.error}
        </div>
      )}

      {/* Agent trace — collapsible */}
      <div className="border border-zinc-700 bg-zinc-800">
        <button
          type="button"
          onClick={() => setTraceOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-xs font-medium text-purple-400">Agent trace</span>
          <span className="text-xs text-zinc-600">{traceOpen ? "▾" : "▸"}</span>
        </button>
        {traceOpen && (
          <div className="flex flex-col gap-1.5 border-t border-zinc-700 px-3 py-2">
            <p className="font-mono text-xs text-zinc-500">
              <span className="font-medium">Pipeline:</span>{" "}
              {data.agentTrace.totalCandidatesRetrieved} retrieved →{" "}
              {data.agentTrace.dedupedCandidates} deduped →{" "}
              {data.agentTrace.verificationPasses} verified
            </p>
            <p className="text-xs font-medium text-zinc-500">Sub-queries:</p>
            <ol className="flex flex-col gap-0.5">
              {data.agentTrace.subQueriesFired.map((q, i) => (
                <li key={i} className="font-mono text-xs text-zinc-500">
                  {i + 1}. {q}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Shortlist */}
      <div className="flex flex-col gap-3">
        {data.shortlist.map((entry, i) => (
          <SupplierCard key={i} entry={entry} />
        ))}
      </div>

      {data.shortlist.length === 0 && !data.error && (
        <p className="text-xs text-zinc-600">No candidates returned.</p>
      )}
    </div>
  );
}
