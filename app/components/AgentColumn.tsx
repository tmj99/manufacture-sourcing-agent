"use client";

import { useState } from "react";
import { type AgentData, type ShortlistEntry } from "@/app/lib/types";

interface Props {
  data: AgentData;
}

const CONFIDENCE: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-600",
};

function SupplierCard({ entry }: { entry: ShortlistEntry }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-purple-100 bg-purple-50/30 p-4">
      {/* Name + confidence */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{entry.supplierName}</p>
          <a
            href={`https://${entry.primaryDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            {entry.primaryDomain}
          </a>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONFIDENCE[entry.matchConfidence] ?? CONFIDENCE.low}`}>
            {entry.matchConfidence}
          </span>
          {entry.languageOfEvidence && entry.languageOfEvidence !== "English" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
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
              <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
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
              <span key={i} className="rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
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
              <span key={i} className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
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
              className="truncate text-xs text-blue-600 hover:underline"
            >
              {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 65)}
            </a>
          ))}
        </div>
      )}

      {/* Gaps */}
      {entry.gaps.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded border border-zinc-200 bg-white px-2.5 py-2">
          <p className="text-xs font-medium text-zinc-400">Gaps · next analyst steps</p>
          {entry.gaps.map((g, i) => (
            <p key={i} className="text-xs text-zinc-400">⚠ {g}</p>
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
          <h2 className="text-sm font-semibold text-purple-800">Exa sourcing agent</h2>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            {data.shortlist.length} candidates
          </span>
        </div>
        <p className="text-xs text-purple-400">Decomposes → searches → verifies → synthesizes</p>
      </div>

      {data.degraded && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Synthesis step failed — showing raw candidates.
        </div>
      )}
      {data.error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {data.error}
        </div>
      )}

      {/* Agent trace — collapsible */}
      <div className="rounded border border-purple-100 bg-purple-50/40">
        <button
          type="button"
          onClick={() => setTraceOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-xs font-medium text-purple-700">Agent trace</span>
          <span className="text-xs text-purple-400">{traceOpen ? "▾" : "▸"}</span>
        </button>
        {traceOpen && (
          <div className="flex flex-col gap-1.5 border-t border-purple-100 px-3 py-2">
            <p className="text-xs text-zinc-500">
              <span className="font-medium">Pipeline:</span>{" "}
              {data.agentTrace.totalCandidatesRetrieved} retrieved →{" "}
              {data.agentTrace.dedupedCandidates} deduped →{" "}
              {data.agentTrace.verificationPasses} verified
            </p>
            <p className="text-xs font-medium text-zinc-500">Sub-queries:</p>
            <ol className="flex flex-col gap-0.5">
              {data.agentTrace.subQueriesFired.map((q, i) => (
                <li key={i} className="text-xs text-zinc-500">
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
        <p className="text-xs text-zinc-400">No candidates returned.</p>
      )}
    </div>
  );
}
