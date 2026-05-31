import { type GoogleData } from "@/app/lib/types";

interface Props {
  data: GoogleData;
}

export function GoogleColumn({ data }: Props) {
  const outOfRegion = data.results.filter((r) => !r.inTargetGeo).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Google search</h2>
          {outOfRegion > 0 && (
            <span className="bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">
              {outOfRegion}/{data.results.length} outside region
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600">Keyword matching · same query</p>
      </div>

      {/* Query sent verbatim */}
      <div className="border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-400">Query: </span>
        <span className="font-mono">{data.query}</span>
      </div>

      {/* Error */}
      {data.error && (
        <div className="border border-red-900 bg-red-950 px-3 py-2 text-xs text-red-400">
          {data.error}
        </div>
      )}

      {/* Results */}
      <ol className="flex flex-col gap-4">
        {data.results.map((r, i) => (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-start gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-300 hover:underline"
              >
                {r.title}
              </a>
              {!r.inTargetGeo && (
                <span className="shrink-0 bg-amber-950 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                  ⚠ outside target region
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-zinc-600">
              {new URL(r.url).hostname.replace(/^www\./, "")}
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">{r.snippet}</p>
          </li>
        ))}
      </ol>

      {data.results.length === 0 && !data.error && (
        <p className="text-xs text-zinc-600">No results.</p>
      )}
    </div>
  );
}
