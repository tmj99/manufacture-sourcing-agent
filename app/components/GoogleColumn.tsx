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
          <h2 className="text-sm font-semibold text-zinc-700">Google search</h2>
          {outOfRegion > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {outOfRegion}/{data.results.length} outside region
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">Keyword matching · same query</p>
      </div>

      {/* Query sent verbatim */}
      <div className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-500">Query: </span>
        {data.query}
      </div>

      {/* Error */}
      {data.error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
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
                className="text-sm text-zinc-700 hover:underline"
              >
                {r.title}
              </a>
              {!r.inTargetGeo && (
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  ⚠ outside target region
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {new URL(r.url).hostname.replace(/^www\./, "")}
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">{r.snippet}</p>
          </li>
        ))}
      </ol>

      {data.results.length === 0 && !data.error && (
        <p className="text-xs text-zinc-400">No results.</p>
      )}
    </div>
  );
}
