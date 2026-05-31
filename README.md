# Manufacture Sourcing Agent

A supplier discovery applet for **senior consultants at strategic sourcing consultancies**. The user describes a capability requirement (not an entity name), and the applet runs three parallel pipelines side by side.

## The thesis

Strategic sourcing is *concept search*, not entity search. The query is a capability profile — *"AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg in Mexico or Eastern Europe"* — not a name. Keyword search structurally fails on these queries. Exa's neural retrieval over the open web does not.

## The three columns

| Column | What it shows |
|---|---|
| **Google (Serper)** | Same query, keyword search. Results flagged when the supplier's domain is outside the target geography — the visible failure of keyword matching on capability queries. |
| **Exa neural search** | Same query, semantic retrieval. Returns spec-matching candidates including non-English-primary suppliers Google misses. |
| **Exa sourcing agent** | Decomposes the spec into capability sub-queries, fans out through Exa, verifies each candidate against its own domain, and returns a structured shortlist with sourced evidence per supplier — the deliverable a consultant hands to a client. |

All three columns receive the exact same input. Queries are shown verbatim above each column.

## Environment variables

```
EXA_API_KEY=
SERPER_API_KEY=
ANTHROPIC_API_KEY=
```

Copy `.env.example` to `.env.local` and fill in the three keys. All keys are called server-side only — none are exposed to the client.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use one of the three preset buttons to fill the form, then click **Find suppliers**.

**Expected timing:** left and center columns return in ~3–5 seconds; the right column (agent) takes ~20–40 seconds and shows a live step indicator while it works.

## Deploy (Vercel)

```bash
git push
```

Set the three env vars in the Vercel dashboard. The agent route exports `maxDuration = 60` to raise the serverless function timeout above the default 10s.

## Cost

All three services offer free tiers sufficient for demo use:
- **Exa** — ~1k requests/month free; `search()` ≈ $7/1k
- **Serper** — 2,500 free credits
- **Anthropic** — pay-as-you-go; Haiku is ~$0.001/agent run

## Validation

`phase0-spike/` contains the Phase 0 validation spike — three capability-shaped sourcing queries run against both Serper and Exa before any UI work, with raw output saved to `.txt` files and a `verdict.md` with the go/no-go ruling. The validation confirmed Exa materially outperforms Google on geographic reach and supplier-page relevance for capability-shaped queries (BORDERLINE → PROCEED).
