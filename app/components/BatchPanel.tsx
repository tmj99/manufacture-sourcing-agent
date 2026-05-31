"use client";

import { useState } from "react";
import { type BatchSpecResult, type BatchResponse } from "@/app/lib/types";
import { geoMatch } from "@/app/lib/utils";
import { exportSpecToExcel, exportAllToExcel } from "@/app/lib/export";

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

const inputClass =
  "w-full border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";

// ── Per-spec candidate table ─────────────────────────────────────────────────

function CandidateTable({
  result,
  selected,
  onToggle,
}: {
  result: BatchSpecResult;
  selected: Set<number>;
  onToggle: (i: number) => void;
}) {
  if (result.status !== "completed") {
    return (
      <p className="py-10 text-center text-xs text-zinc-600">
        {result.status === "error"
          ? (result.error ?? "An error occurred.")
          : "Job exceeded time limit — try again or narrow the spec."}
      </p>
    );
  }
  if (result.candidates.length === 0) {
    return (
      <p className="py-10 text-center text-xs text-zinc-600">
        No candidates returned.
      </p>
    );
  }

  const maxReached = selected.size >= 2;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-500">
            <th className="w-8 py-2.5 pr-2 font-medium">#</th>
            <th className="w-6 py-2.5 pr-3 font-medium"></th>
            <th className="py-2.5 pr-4 font-medium">Company Name</th>
            <th className="py-2.5 pr-4 font-medium">Website</th>
            <th className="py-2.5 pr-4 font-medium">Location</th>
            <th className="w-20 py-2.5 pr-4 font-medium">Geo Match</th>
            <th className="py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {result.candidates.map((c, i) => {
            const isSelected = selected.has(i);
            const isDisabled = maxReached && !isSelected;
            const matched = geoMatch(c.location, result.geography);
            return (
              <tr
                key={i}
                className={`border-b border-zinc-900 transition-colors ${
                  isSelected ? "bg-blue-950/30" : "hover:bg-zinc-900/40"
                }`}
              >
                <td className="py-2.5 pr-2 text-zinc-600">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => onToggle(i)}
                    className="cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-25"
                  />
                </td>
                <td className="py-2.5 pr-4 font-medium text-zinc-200">
                  {c.name || "—"}
                </td>
                <td className="py-2.5 pr-4">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-400 hover:underline"
                    >
                      {c.domain || c.url}
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-zinc-400">
                  {c.location || "—"}
                </td>
                <td className="py-2.5 pr-4">
                  {result.geography ? (
                    matched ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-zinc-600">?</span>
                    )
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="max-w-xs py-2.5">
                  <span
                    className="line-clamp-2 text-zinc-500"
                    title={c.description}
                  >
                    {c.description || "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  onExit: () => void;
}

export function BatchPanel({ onExit }: Props) {
  const [rows, setRows] = useState<SpecRow[]>(INITIAL_ROWS);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BatchSpecResult[] | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  // Per-tab selection state — scaffolded here for Fix 3 (drill-down)
  const [selections, setSelections] = useState<Set<number>[]>([]);

  function setRow(i: number, field: keyof SpecRow, value: string) {
    setRows((prev) =>
      prev.map((r, j) => (j === i ? { ...r, [field]: value } : r))
    );
  }

  function toggleSelection(tabIdx: number, candidateIdx: number) {
    setSelections((prev) => {
      const next = prev.map((s) => new Set(s));
      const set = next[tabIdx] ?? new Set<number>();
      if (set.has(candidateIdx)) {
        set.delete(candidateIdx);
      } else if (set.size < 2) {
        set.add(candidateIdx);
      }
      next[tabIdx] = set;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const anchors = rows
      .filter((r) => r.spec.trim().length >= 10)
      .map((r) => ({ spec: r.spec.trim(), geography: r.geography.trim() }));
    if (anchors.length === 0) return;

    setLoading(true);
    setResults(null);
    setActiveTab(0);
    setSelections([]);
    try {
      const res = await fetch("/api/source/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchors }),
      });
      const data: BatchResponse = await res.json();
      setResults(data.results);
      setSelections(data.results.map(() => new Set<number>()));
    } finally {
      setLoading(false);
    }
  }

  const activeCount = rows.filter((r) => r.spec.trim().length >= 10).length;
  const activeSelection = results
    ? (selections[activeTab] ?? new Set<number>())
    : new Set<number>();

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
              Execute search on up to 5 specs in parallel to speed up your
              sourcing process.
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

      <div className="mx-auto max-w-6xl px-6 py-8">
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
            {/* Results header */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-400">
                Results — {results.length} spec{results.length !== 1 ? "s" : ""}
              </h2>
              <button
                type="button"
                onClick={() => exportAllToExcel(results, results.map(() => null))}
                className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 transition-colors"
              >
                ↓ Download all specs (.xlsx)
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-zinc-800">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`flex shrink-0 flex-col gap-0.5 border-b-2 px-4 py-3 text-left transition-colors ${
                    activeTab === i
                      ? "border-blue-500 text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="max-w-[220px] truncate text-xs font-medium">
                    {r.spec.length > 55 ? r.spec.slice(0, 55) + "…" : r.spec}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.geography && (
                      <span className="text-xs text-zinc-600">
                        {r.geography}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        r.status === "completed"
                          ? "text-green-400"
                          : r.status === "error"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {r.status === "completed"
                        ? `${r.candidates.length} candidates`
                        : r.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-1 py-2.5">
              <p className="text-xs text-zinc-600">
                {activeSelection.size > 0
                  ? `${activeSelection.size} selected — deep research coming soon`
                  : "Select up to 2 companies to deep-research them"}
              </p>
              <div className="flex items-center gap-2">
                {results[activeTab]?.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => exportSpecToExcel(results[activeTab], null)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 transition-colors"
                  >
                    ↓ Download this spec
                  </button>
                )}
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="cursor-not-allowed rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-600"
                >
                  {activeSelection.size > 0
                    ? `Deep Research (${activeSelection.size})`
                    : "Deep Research"}
                </button>
              </div>
            </div>

            {/* Active tab table */}
            {results[activeTab] && (
              <CandidateTable
                result={results[activeTab]}
                selected={activeSelection}
                onToggle={(i) => toggleSelection(activeTab, i)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
