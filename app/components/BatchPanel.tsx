"use client";

import { useState } from "react";
import { type BatchSpecResult, type BatchResponse } from "@/app/lib/types";

interface SpecRow {
  spec: string;
  geography: string;
}

const PRESETS: SpecRow[] = [
  {
    spec: "AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg",
    geography: "Mexico, Eastern Europe",
  },
  {
    spec: "FDA-registered contract pharmaceutical packaging facilities with serialization capability for blister packs",
    geography: "India, Mexico",
  },
  {
    spec: "IATF 16949-certified contract manufacturers with experience in EV battery module assembly capable of 10,000+ units per month",
    geography: "Eastern Europe, Southeast Asia",
  },
];

const EMPTY: SpecRow = { spec: "", geography: "" };
const INITIAL_ROWS: SpecRow[] = [...PRESETS, EMPTY, EMPTY];

const STATUS_STYLES = {
  completed: "bg-green-950 text-green-400",
  timeout: "bg-amber-950 text-amber-400",
  error: "bg-red-950 text-red-400",
};

const inputClass =
  "w-full border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";

function ResultCard({ result }: { result: BatchSpecResult }) {
  return (
    <div className="flex flex-col gap-3 border border-zinc-800 bg-zinc-900 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <p className="line-clamp-2 font-mono text-sm font-medium text-zinc-300">
            {result.spec}
          </p>
          {result.geography && (
            <span className="mt-1 inline-block bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              {result.geography}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[result.status]}`}>
            {result.status}
          </span>
          {result.status === "completed" && (
            <span className="text-xs text-zinc-600">
              {result.candidates.length} candidates
            </span>
          )}
        </div>
      </div>

      {/* Error / timeout */}
      {result.status !== "completed" && (
        <p className="text-xs text-zinc-600">
          {result.status === "timeout"
            ? "Job exceeded time limit — try again or narrow the spec."
            : result.error ?? "Unknown error."}
        </p>
      )}

      {/* Candidate list */}
      {result.status === "completed" && result.candidates.length === 0 && (
        <p className="text-xs text-zinc-600">No candidates returned.</p>
      )}
      {result.candidates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {result.candidates.map((c, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-zinc-200">{c.name}</span>
                {c.location && (
                  <span className="text-xs text-zinc-600">{c.location}</span>
                )}
              </div>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-blue-400 hover:underline"
                >
                  {c.domain || c.url}
                </a>
              )}
              {c.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
                  {c.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  onExit: () => void;
}

export function BatchPanel({ onExit }: Props) {
  const [rows, setRows] = useState<SpecRow[]>(INITIAL_ROWS);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BatchSpecResult[] | null>(null);

  function setRow(i: number, field: keyof SpecRow, value: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const anchors = rows
      .filter((r) => r.spec.trim().length >= 10)
      .map((r) => ({ spec: r.spec.trim(), geography: r.geography.trim() }));

    if (anchors.length === 0) return;

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/source/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchors }),
      });
      const data: BatchResponse = await res.json();
      setResults(data.results);
    } finally {
      setLoading(false);
    }
  }

  const activeCount = rows.filter((r) => r.spec.trim().length >= 10).length;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">
              Batch Supplier Discovery
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              Execute search on up to 5 specs in parallel to speed up your sourcing process.
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-zinc-600 hover:text-zinc-400"
          >
            ← Single spec
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 border border-zinc-800 bg-zinc-900 p-3 sm:grid-cols-3"
              >
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Spec {i + 1}
                    {i < 3 && (
                      <span className="ml-1 text-zinc-700">(preset)</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={row.spec}
                    onChange={(e) => setRow(i, "spec", e.target.value)}
                    placeholder="Describe the capability requirement…"
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Geography
                  </label>
                  <input
                    type="text"
                    value={row.geography}
                    onChange={(e) => setRow(i, "geography", e.target.value)}
                    placeholder="e.g. Mexico, Eastern Europe"
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || activeCount === 0}
            className="bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? `Running ${activeCount} spec${activeCount > 1 ? "s" : ""}…`
              : `Run batch (${activeCount} spec${activeCount !== 1 ? "s" : ""})`}
          </button>
        </form>

        {/* Results */}
        {results && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-semibold text-zinc-400">
              Results — {results.length} spec{results.length !== 1 ? "s" : ""}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {results.map((r, i) => (
                <ResultCard key={i} result={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
