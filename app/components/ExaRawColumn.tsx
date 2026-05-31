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
          <h2 className="text-sm font-semibold text-blue-400">Exa neural search</h2>
          {nonEnglish > 0 && (
            <span className="bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-400">
              {nonEnglish} non-English
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600">Semantic retrieval · same query</p>
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
      <ol className="flex flex-col gap-5">
        {data.results.map((r, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-start gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-400 hover:underline"
              >
                {r.title || r.url}
              </a>
              {r.language && (
                <span className="shrink-0 bg-blue-950 px-1.5 py-0.5 text-xs font-medium text-blue-400">
                  {r.language}
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-zinc-600">
              {new URL(r.url).hostname.replace(/^www\./, "")}
              {r.publishedDate && <> · {r.publishedDate.slice(0, 10)}</>}
            </p>
            {r.highlights[0] && (
              <p className="border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-300">
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
        <p className="text-xs text-zinc-600">No results.</p>
      )}
    </div>
  );
}
