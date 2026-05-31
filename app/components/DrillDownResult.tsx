"use client";

import { useState } from "react";
import { type AgentData } from "@/app/lib/types";
import { SupplierCard } from "./AgentColumn";

interface Props {
  data: AgentData;
  onClose: () => void;
}

export function DrillDownResult({ data, onClose }: Props) {
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <div className="mt-4 border border-blue-900 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-900 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-blue-400">Deep research results</p>
          <p className="text-xs text-zinc-600">
            {data.shortlist.length} candidate{data.shortlist.length !== 1 ? "s" : ""} —
            decomposes spec → verifies against company domains → synthesizes
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
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
            <span className="text-xs font-medium text-blue-400">Agent trace</span>
            <span className="text-xs text-zinc-600">{traceOpen ? "▾" : "▸"}</span>
          </button>
          {traceOpen && (
            <div className="flex flex-col gap-1.5 border-t border-zinc-700 px-3 py-2">
              <p className="font-mono text-xs text-zinc-500">
                <span className="font-medium">Pipeline:</span>{" "}
                {data.agentTrace.verificationPasses} candidate
                {data.agentTrace.verificationPasses !== 1 ? "s" : ""} verified →{" "}
                {data.agentTrace.totalCandidatesRetrieved} pages fetched
              </p>
              <p className="text-xs font-medium text-zinc-500">Sub-queries fired:</p>
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
          <p className="text-xs text-zinc-600">No structured output returned.</p>
        )}
      </div>
    </div>
  );
}
