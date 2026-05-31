"use client";

import { useState, useRef } from "react";
import { SpecForm } from "@/app/components/SpecForm";
import { GoogleColumn } from "@/app/components/GoogleColumn";
import { ExaRawColumn } from "@/app/components/ExaRawColumn";
import { AgentColumn } from "@/app/components/AgentColumn";
import { AgentProgress } from "@/app/components/AgentProgress";
import { BatchPanel } from "@/app/components/BatchPanel";
import { type Anchor } from "@/app/lib/schema";
import { type GoogleData, type ExaRawData, type AgentData } from "@/app/lib/types";

export default function Home() {
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [exaRawData, setExaRawData] = useState<ExaRawData | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  // Increment on each submit to reset the AgentProgress timer.
  const submissionId = useRef(0);
  const [submissionKey, setSubmissionKey] = useState(0);

  const loading = baselineLoading || agentLoading;

  async function handleSubmit(anchor: Anchor) {
    submissionId.current += 1;
    setSubmissionKey(submissionId.current);
    setBaselineLoading(true);
    setAgentLoading(true);
    setGoogleData(null);
    setExaRawData(null);
    setAgentData(null);
    setHasResult(true);

    const body = JSON.stringify(anchor);
    const headers = { "Content-Type": "application/json" };

    // Baseline (Google + Exa raw) — resolves in ~3–5s
    fetch("/api/source", { method: "POST", headers, body })
      .then((r) => r.json())
      .then((data) => {
        setGoogleData(data.google ?? null);
        setExaRawData(data.exa_raw ?? null);
        setBaselineLoading(false);
      })
      .catch(() => setBaselineLoading(false));

    // Agent — resolves in ~20–40s, independently
    fetch("/api/source/agent", { method: "POST", headers, body })
      .then((r) => r.json())
      .then((data) => {
        setAgentData(data.agent ?? null);
        setAgentLoading(false);
      })
      .catch(() => setAgentLoading(false));
  }

  if (batchMode) {
    return <BatchPanel onExit={() => setBatchMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-base font-semibold text-zinc-900">
            Manufacture Sourcing Agent
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Supplier Discovery &amp; Capability Verification
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        <SpecForm onSubmit={handleSubmit} loading={loading} />
        {/* Batch mode toggle — intentionally subtle */}
        <button
          type="button"
          onClick={() => setBatchMode(true)}
          className="mt-2 text-xs text-zinc-300 hover:text-zinc-400"
        >
          ↓ Batch mode
        </button>
      </div>

      {/* Results */}
      {hasResult && (
        <div className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Left — Google baseline */}
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="border-t-4 border-t-zinc-300 p-5">
                {baselineLoading ? (
                  <ColumnSkeleton />
                ) : googleData ? (
                  <GoogleColumn data={googleData} />
                ) : null}
              </div>
            </div>

            {/* Center — Exa raw */}
            <div className="overflow-hidden rounded-lg border border-blue-100 bg-white">
              <div className="border-t-4 border-t-blue-400 p-5">
                {baselineLoading ? (
                  <ColumnSkeleton tint="blue" />
                ) : exaRawData ? (
                  <ExaRawColumn data={exaRawData} />
                ) : null}
              </div>
            </div>

            {/* Right — Exa agent */}
            <div className="overflow-hidden rounded-lg border border-purple-100 bg-white shadow-sm">
              <div className="border-t-4 border-t-purple-500 p-5">
                {agentLoading ? (
                  <AgentProgress key={submissionKey} />
                ) : agentData ? (
                  <AgentColumn data={agentData} />
                ) : null}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ColumnSkeleton({ tint }: { tint?: "blue" }) {
  const base = tint === "blue" ? "bg-blue-100" : "bg-zinc-200";
  const light = tint === "blue" ? "bg-blue-50" : "bg-zinc-100";
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className={`h-4 w-28 rounded ${base}`} />
      <div className={`h-2 w-20 rounded ${light}`} />
      <div className={`h-8 rounded ${light}`} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className={`h-3 w-3/4 rounded ${base}`} />
          <div className={`h-2 w-1/2 rounded ${light}`} />
          <div className={`h-2 w-full rounded ${light}`} />
        </div>
      ))}
    </div>
  );
}
