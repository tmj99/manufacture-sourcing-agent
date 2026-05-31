# Phase 0 Verdict

**Date:** 2026-05-30  
**Verdict: BORDERLINE** — thesis supported, but two quantitative criteria not met and one demo assumption invalidated.

---

## 1. Measurable criteria results

| Criterion | Target | Actual | Result |
|---|---|---|---|
| Serper "Missing:" on ≥50% of results | ≥50% | 0/30 (0%) | **FAIL** |
| Exa non-English-domain specs | ≥2 of 3 specs | 3/3 | **PASS** |
| Manual: Exa ≥3 qualifying per spec | ≥3 per spec | see below | **BORDERLINE** |
| Manual: Serper ≤1 qualifying per spec | ≤1 per spec | see below | **PASS** |

---

## 2. Manual assessment per spec

### Spec 1: aerospace_titanium_machining
*"AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg in Mexico or Eastern Europe"*

**Three qualifying dimensions:** AS9100 + CNC titanium / contract manufacturer / Mexico or Eastern Europe

**Serper — 1 qualifying result:**
- [1] Baja Supplies — Mexico, AS9100, titanium CNC — **MATCHES all three** ✓
- All other 9 results are US-based shops (Connecticut, Massachusetts, Indiana). No Eastern Europe results. Geography constraint completely missed.

**Exa — 2–3 qualifying results:**
- [1] PCNC (aeronc.com) — Toluca, Mexico, AS9100 Rev D, NADCAP Merit, aerospace CNC — **FULL MATCH** ✓
- [4] Radii (radii.com.mx) — Mexico, IATF 16949 & AS9100, 5-axis CNC — **FULL MATCH** ✓
- [8] MESIT machinery (mesitmachining.com) — Czech Republic, aerospace/aircraft precision machining — **PROBABLE MATCH** (AS9100 not explicitly confirmed in excerpt; Czech Republic = Eastern Europe)

**Sub-verdict: BORDERLINE** (2 definite, 1 probable; fails ≥3 strict threshold but decisively outperforms Serper)

---

### Spec 2: contract_pharma_packaging
*"FDA-registered contract pharmaceutical packaging facilities with serialization capability for blister packs in India or Mexico"*

**Serper — 0 qualifying results:**  
All 10 results are: market research reports (GrandView, Fact.MR, DataIntelo), an FDA facility-fee spreadsheet, a Facebook group post, and an Instagram post. **Not a single actual facility page returned.** Complete failure on this spec.

**Exa — 1 clear qualifying result:**
- [2] Piramal Pharma Solutions, Pithampur — India, USFDA-approved, OSD manufacturing and packaging, 4.5 billion units/year — **PROBABLE MATCH** (serialization and blister packs not explicitly confirmed in excerpt, but USFDA approval and India geography confirmed)
- [1] Abhinav Enterprises — India, blister packaging, no FDA/serialization confirmed
- Other results are machinery suppliers, news articles, or unconfirmed

**Sub-verdict: BORDERLINE** (Exa dramatically better — returns actual supplier pages vs. market research — but ≥3 fully qualifying results not met; serialization + blister specificity is a hard constraint that limits retrieval)

---

### Spec 3: ev_battery_module_assembly
*"IATF 16949-certified contract manufacturers with experience in EV battery module assembly capable of 10,000+ units per month in Eastern Europe or Southeast Asia"*

**Serper — 0–1 qualifying results:**  
Results are a mix of: top EV battery brand rankings, market research, a ProLogium press release (solid-state, Taiwan), a BYD news article, and a generic CMs list. Geographic constraint entirely missed. No contract manufacturer in Eastern Europe or SE Asia returned.

**Exa — 1–2 qualifying results:**
- [4] Banpu NEXT / Durapower — Thailand (SE Asia), battery module assembly plant, mass production for commercial EVs — **PROBABLE MATCH** (IATF 16949 and exact volume not confirmed in excerpt)
- [1] teamtechnik.pl — Poland (Eastern Europe), building EV battery production line (16,000 systems) — **PARTIAL** (automation integrator, not the contract manufacturer itself)
- [2] EVE Power Hungary — Eastern Europe, BMW supplier — **PARTIAL** (cell manufacturer, not a contract CM; not IATF 16949 confirmed)

**Sub-verdict: BORDERLINE** (Exa returns geographically correct results in SE Asia and Eastern Europe; Serper returns zero; but IATF 16949 + CM + volume combination not fully confirmed)

---

## 3. Key finding: "Missing:" annotations absent from Serper API

The original research noted Google returning explicit "Missing:" annotation text for the aerospace query. **This pattern does not appear in the Serper API response snippets.** Zero "Missing:" strings across all 30 results.

What IS visible instead: Serper returns geographically mismatched results (8/10 US shops for a Mexico/Eastern Europe spec), market research reports instead of supplier pages, and irrelevant brand noise. The failure mode is real — it just isn't self-annotated.

**Impact on the build:** Phase 3 and Phase 6 need to surface failure differently. Instead of "Google annotates its own failure with Missing: tags," the left column's story becomes: "Google returns 10 results — count how many are in the target geography." This is arguably more honest and more visually obvious anyway.

---

## 4. Technical note: search_and_contents deprecated

`exa.search_and_contents()` is deprecated in favor of `exa.search()`, which returns text contents by default. The app (Phases 4–5) should use `exa.search()` / `exa-js` equivalent. For Phase 0 purposes, results are valid.

---

## 5. Overall verdict and go/no-go recommendation

**BORDERLINE → PROCEED with spec adjustments.**

The thesis holds: Exa structurally outperforms Serper across all three categories. The contrast is most legible on:
- Spec 1 (aerospace): strongest result, closest to N=1 validation, use this as primary demo spec
- Spec 2 (pharma): Serper fails completely (market research, no facility pages); Exa returns actual facilities
- Spec 3 (EV): Exa returns geographically correct results; Serper misses geography entirely

The strict ≥3 qualifying criterion is not met on specs 2 and 3, but the qualitative gap is real and demo-legible. The quantitative bar was set against a prior validation result (the aerospace spec was the only tested query); specs 2 and 3 are harder due to higher constraint specificity.

**Do not stop.** Stop criterion was "Exa roughly equivalent to Serper on 2+ of 3 specs" — this is not the case. Exa dominates all three on geographic relevance and returns actual supplier pages vs. market research noise.

**Required adjustments before building:**
1. Remove "Missing: annotations" as the demo punchline; replace with geographic mismatch visualization (count results in target geography)
2. Aerospace spec remains the primary demo; it has the clearest three-column contrast
3. Note `search_and_contents` → `search()` migration in the app build (Phase 4/5)
4. Phase 3 Serper parsing: drop `parse_missing()` regex; instead flag results where the domain is clearly outside the target geography
