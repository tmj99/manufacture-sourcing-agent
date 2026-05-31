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

    fetch("/api/source", { method: "POST", headers, body })
      .then((r) => r.json())
      .then((data) => {
        setGoogleData(data.google ?? null);
        setExaRawData(data.exa_raw ?? null);
        setBaselineLoading(false);
      })
      .catch(() => setBaselineLoading(false));

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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-base font-semibold text-zinc-100">
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
        <button
          type="button"
          onClick={() => setBatchMode(true)}
          className="mt-2 text-xs text-zinc-700 hover:text-zinc-500"
        >
          ↓ Batch mode
        </button>
      </div>

      {/* Results */}
      {hasResult && (
        <div className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Left — Google baseline */}
            <div className="overflow-hidden border border-zinc-800 bg-zinc-900">
              <div className="border-t-2 border-t-zinc-600 p-5">
                {baselineLoading ? (
                  <ColumnSkeleton />
                ) : googleData ? (
                  <GoogleColumn data={googleData} />
                ) : null}
              </div>
            </div>

            {/* Center — Exa raw */}
            <div className="overflow-hidden border border-zinc-800 bg-zinc-900">
              <div className="border-t-2 border-t-blue-500 p-5">
                {baselineLoading ? (
                  <ColumnSkeleton tint="blue" />
                ) : exaRawData ? (
                  <ExaRawColumn data={exaRawData} />
                ) : null}
              </div>
            </div>

            {/* Right — Exa agent */}
            <div className="overflow-hidden border border-zinc-800 bg-zinc-900">
              <div className="border-t-2 border-t-purple-500 p-5">
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
  const base = tint === "blue" ? "bg-blue-900/30" : "bg-zinc-800";
  const light = tint === "blue" ? "bg-blue-900/20" : "bg-zinc-800/60";
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className={`h-4 w-28 ${base}`} />
      <div className={`h-2 w-20 ${light}`} />
      <div className={`h-8 ${light}`} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className={`h-3 w-3/4 ${base}`} />
          <div className={`h-2 w-1/2 ${light}`} />
          <div className={`h-2 w-full ${light}`} />
        </div>
      ))}
    </div>
  );
}
