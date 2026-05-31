#!/usr/bin/env python3
"""Phase 0 validation spike: Exa vs Serper on capability-shaped sourcing queries."""

import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
import requests
from exa_py import Exa

# Load from project root .env (one level up from this script)
load_dotenv(Path(__file__).parent.parent / ".env")

EXA_API_KEY = os.environ["EXA_API_KEY"]
SERPER_API_KEY = os.environ["SERPER_API_KEY"]
exa = Exa(EXA_API_KEY)

SPECS = {
    "aerospace_titanium_machining": (
        "AS9100-certified contract manufacturers capable of CNC machining "
        "titanium components under 50kg in Mexico or Eastern Europe"
    ),
    "contract_pharma_packaging": (
        "FDA-registered contract pharmaceutical packaging facilities "
        "with serialization capability for blister packs in India or Mexico"
    ),
    "ev_battery_module_assembly": (
        "IATF 16949-certified contract manufacturers with experience in "
        "EV battery module assembly capable of 10,000+ units per month in "
        "Eastern Europe or Southeast Asia"
    ),
}

# TLDs associated with non-English-primary jurisdictions in the target geographies
NON_ENGLISH_TLDS = {
    "mx", "cz", "tr", "in", "cn", "vn", "id", "pl", "hu",
    "sk", "ro", "bg", "hr", "rs", "th", "my", "ph", "kr", "jp",
}


def parse_missing(snippet: str) -> list[str]:
    """Extract 'Missing:' terms from Serper snippet text (regex on plain text)."""
    matches = re.findall(r"[Mm]issing:\s*([^\n]+)", snippet or "")
    return [m.strip() for m in matches if m.strip()]


def language_tag(url: str, title: str = "") -> str:
    """Return a 2-letter language hint from TLD, or '' if not detectable."""
    try:
        tld = urlparse(url).netloc.lower().rstrip("/").rsplit(".", 1)[-1]
        if tld in NON_ENGLISH_TLDS:
            return tld.upper()
    except Exception:
        pass
    if title and any(ord(c) > 127 for c in title):
        return "non-ASCII"
    return ""


def unique_domains(results: list[dict]) -> set[str]:
    domains = set()
    for r in results:
        try:
            domains.add(urlparse(r["url"]).netloc.lower().lstrip("www."))
        except Exception:
            pass
    return domains


def run_serper(spec: str) -> list[dict]:
    resp = requests.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
        json={"q": spec, "num": 10},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for r in data.get("organic", []):
        snippet = r.get("snippet", "")
        results.append({
            "title": r.get("title", ""),
            "url": r.get("link", ""),
            "snippet": snippet[:200],
            "missing": parse_missing(snippet),
        })
    return results


def run_exa(spec: str) -> list[dict]:
    capability_query = f"capability, certification, capacity match for: {spec}"
    verification_query = (
        "Does this supplier match the spec? "
        "What capabilities, certifications, and geographic reach are evidenced?"
    )
    response = exa.search_and_contents(
        spec,
        type="neural",
        num_results=8,
        text={"max_characters": 1000},
        highlights={"query": capability_query, "num_sentences": 3},
        summary={"query": verification_query},
    )
    results = []
    for r in response.results:
        highlight = (r.highlights[0] if r.highlights else "") if hasattr(r, "highlights") and r.highlights else ""
        summary = (r.summary or "") if hasattr(r, "summary") else ""
        results.append({
            "title": r.title or "",
            "url": r.url,
            "published_date": getattr(r, "published_date", "") or "",
            "highlight": highlight[:300],
            "summary": summary[:400],
            "score": getattr(r, "score", None),
            "language": language_tag(r.url, r.title or ""),
        })
    return results


def format_spec_output(spec_key: str, spec: str, serper: list[dict], exa_res: list[dict]) -> list[str]:
    lines = []
    sep = "=" * 80

    lines += [sep, f"SPEC KEY : {spec_key}", f"QUERY    : {spec}", sep, ""]

    # Pipeline A
    lines += [
        "── PIPELINE A: Google (Serper) ─────────────────────────────────────────────",
        f"Query sent verbatim: {spec}",
        "",
    ]
    serper_missing_total = 0
    for i, r in enumerate(serper, 1):
        lines.append(f"[{i}] {r['title']}")
        lines.append(f"    {r['url']}")
        lines.append(f"    Snippet : {r['snippet']}")
        if r["missing"]:
            serper_missing_total += len(r["missing"])
            lines.append(f"    *** Missing: {' | '.join(r['missing'])} ***")
        lines.append("")

    # Pipeline B
    lines += [
        "── PIPELINE B: Exa (neural) ────────────────────────────────────────────────",
        f"Query sent verbatim: {spec}",
        "",
    ]
    for i, r in enumerate(exa_res, 1):
        lang = f" [{r['language']}]" if r["language"] else ""
        lines.append(f"[{i}] {r['title']}{lang}")
        lines.append(f"    {r['url']}")
        lines.append(f"    Published : {r['published_date']}")
        lines.append(f"    Highlight : {r['highlight']}")
        lines.append(f"    Summary   : {r['summary']}")
        lines.append("")

    # Delta summary
    serper_domains = unique_domains(serper)
    exa_domains = unique_domains(exa_res)
    exa_non_english = sum(1 for r in exa_res if r["language"])
    serper_non_english = sum(1 for r in serper if language_tag(r["url"]))

    lines += [
        "── DELTA SUMMARY ───────────────────────────────────────────────────────────",
        f"Serper results          : {len(serper)}",
        f"Exa results             : {len(exa_res)}",
        f"Serper unique domains   : {len(serper_domains)}",
        f"Exa unique domains      : {len(exa_domains)}",
        f"Serper 'Missing:' hits  : {serper_missing_total}  (across {len(serper)} results)",
        f"Serper non-English TLDs : {serper_non_english}",
        f"Exa non-English TLDs    : {exa_non_english}",
        "",
        "MANUAL CHECK REQUIRED:",
        "  Count candidates meeting ALL THREE dimensions (capability + cert + geography)",
        "  Serper ≤1 qualifying | Exa ≥3 qualifying = PASS for this spec",
        "",
    ]

    return lines, serper_missing_total, exa_non_english


def main():
    out_dir = Path(__file__).parent
    all_lines = []
    aggregate = {}

    for spec_key, spec in SPECS.items():
        print(f"\n>>> Running spec: {spec_key} ...", flush=True)

        try:
            serper_res = run_serper(spec)
        except Exception as e:
            print(f"  Serper ERROR: {e}", file=sys.stderr)
            serper_res = []

        try:
            exa_res = run_exa(spec)
        except Exception as e:
            print(f"  Exa ERROR: {e}", file=sys.stderr)
            exa_res = []

        lines, missing_count, exa_non_english = format_spec_output(
            spec_key, spec, serper_res, exa_res
        )

        # Save per-spec output
        out_file = out_dir / f"output_{spec_key}.txt"
        out_file.write_text("\n".join(lines))
        print(f"  Saved → {out_file}")

        all_lines.extend(lines)
        aggregate[spec_key] = {
            "serper_count": len(serper_res),
            "exa_count": len(exa_res),
            "serper_missing_hits": missing_count,
            "exa_non_english": exa_non_english,
        }

    # Aggregate summary
    total_serper = sum(v["serper_count"] for v in aggregate.values())
    total_missing = sum(v["serper_missing_hits"] for v in aggregate.values())
    specs_with_non_english = sum(1 for v in aggregate.values() if v["exa_non_english"] > 0)

    summary_lines = [
        "=" * 80,
        "AGGREGATE SUMMARY",
        "=" * 80,
    ]
    for k, v in aggregate.items():
        summary_lines.append(f"\n{k}:")
        for stat, val in v.items():
            summary_lines.append(f"  {stat}: {val}")

    missing_pct = (total_missing / total_serper * 100) if total_serper else 0
    summary_lines += [
        "",
        "── MEASURABLE PASS CRITERIA ────────────────────────────────────────────────",
        f"Serper 'Missing:' hits / total Serper results : {total_missing}/{total_serper} ({missing_pct:.0f}%)",
        f"  Pass criterion: >=50% of results have Missing: annotations → {'PASS' if missing_pct >= 50 else 'FAIL/CHECK'}",
        f"Exa non-English-domain specs : {specs_with_non_english}/3",
        f"  Pass criterion: >=2 specs show non-English Exa results → {'PASS' if specs_with_non_english >= 2 else 'FAIL/CHECK'}",
        "",
        "── MANUAL PASS CRITERIA (review per-spec .txt files) ───────────────────────",
        "  For each spec: Exa ≥3 candidates meeting capability+cert+geography → PASS",
        "  For each spec: Serper ≤1 candidate meeting all three → PASS",
        "",
        "See verdict.md for final ruling.",
    ]

    # Print aggregate to console
    print("\n" + "\n".join(summary_lines))

    # Save combined output
    all_out = out_dir / "output_all.txt"
    all_out.write_text("\n".join(all_lines + [""] + summary_lines))
    print(f"\n>>> All output saved → {all_out}")


if __name__ == "__main__":
    main()
