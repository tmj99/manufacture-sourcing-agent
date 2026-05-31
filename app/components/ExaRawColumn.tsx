import { type ExaRawData } from "@/app/lib/types";

interface Props {
  data: ExaRawData;
}

export function ExaRawColumn({ data }: Props) {
  const nonEnglish = data.results.filter((r) => r.language).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-blue-800">Exa neural search</h2>
          {nonEnglish > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {nonEnglish} non-English
            </span>
          )}
        </div>
        <p className="text-xs text-blue-400">Semantic retrieval · same query</p>
      </div>

      {/* Query sent verbatim */}
      <div className="rounded border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-600">Query: </span>
        {data.query}
      </div>

      {/* Error */}
      {data.error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {data.error}
        </div>
      )}

      {/* Results */}
      <ol className="flex flex-col gap-5">
        {data.results.map((r, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-start gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                {r.title || r.url}
              </a>
              {r.language && (
                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-600">
                  {r.language}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {new URL(r.url).hostname.replace(/^www\./, "")}
              {r.publishedDate && <> &middot; {r.publishedDate.slice(0, 10)}</>}
            </p>
            {r.highlights[0] && (
              <p className="rounded bg-blue-50 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-700">
                {r.highlights[0]}
              </p>
            )}
            {r.summary && (
              <p className="text-xs leading-relaxed text-zinc-500">{r.summary}</p>
            )}
          </li>
        ))}
      </ol>

      {data.results.length === 0 && !data.error && (
        <p className="text-xs text-zinc-400">No results.</p>
      )}
    </div>
  );
}
