"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Decomposing spec", ms: 0 },
  { label: "Searching capabilities", ms: 5000 },
  { label: "Verifying candidates", ms: 14000 },
  { label: "Synthesizing shortlist", ms: 24000 },
];

// key prop should change on every new submission to reset timers.
export function AgentProgress() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map(({ ms }, i) =>
      setTimeout(() => setCurrent(i + 1), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-purple-800">Exa sourcing agent</h2>
      <p className="text-xs text-zinc-400">
        Decomposes → searches → verifies → synthesizes
      </p>
      <div className="mt-2 flex flex-col gap-3">
        {STEPS.map(({ label }, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <span className="text-sm text-green-500">✓</span>
                ) : active ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-zinc-200" />
                )}
              </div>
              <span
                className={`text-xs ${
                  done
                    ? "text-green-600"
                    : active
                    ? "font-medium text-purple-700"
                    : "text-zinc-300"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-400">
        Firing ~15 API calls in sequence…
      </p>
    </div>
  );
}
