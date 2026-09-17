# Funding Guide AI — project context

Read this before making architectural or scope decisions. If a feature isn't described here, ask
before building it.

Longer documents live in `docs/` and are imported where useful:


---

## 1. What this is

**Funding Guide AI** is an internal web platform for **Pangaea Youth Network** (PYN), a nonprofit
youth organisation in Horsens, Denmark. PYN works on youth participation, community building,
newcomer and international-student integration, volunteering, non-formal learning, sustainability
and intercultural cooperation, and depends on external funding to operate.

The problem: funding calls are scattered across municipal pages, national grant databases, EU
portals and foundation sites, each with different eligibility rules, deadlines, budget structures
and partnership requirements. Even when PYN is formally eligible, a call may be a poor strategic
fit or too heavy for their capacity.

The system collects calls into one database, scores each against a stored PYN profile using an
explainable rule-based engine, and tells the user not just *whether* a call fits but *why*, and
whether PYN should lead it or join as a partner.

### Problem statement

**Main:** How can small organisations find relevant funding opportunities when those opportunities
are spread across multiple sources?

1. How can funding opportunities from multiple sources be collected efficiently?
2. How can small organisations find the best-fit opportunity based on requirements and priorities?
3. How can the manual funding search time be reduced?

---

## 2. Delimitations (hard boundaries — don't expand silently)

- Denmark and the EU only.
- A **selected set** of funding platforms, not an exhaustive crawl.
- Data collection is **scraping + manual entry**. Full automated extraction is explicitly not
  guaranteed. See §5 — there is effectively no usable public API in this domain.
- The matching engine is a **rule-based, explainable knowledge-based recommender**. Not ML, not
  self-learning, not a black box. Output is indicative, with confidence labels and manual override.
- **Internal use by PYN only** — single organisation, not multi-tenant SaaS.

If a change would cross one of these lines, flag it as a scope question instead of implementing it.

---

## 3. Repository layout

```
funding-guide-ai/
├── web/          Next.js — dashboard UI + server-side data access
├── worker/       Python — ingestion, normalisation, matching
├── supabase/     config.toml + migrations/ — the schema is the source of truth
├── docs/         living documentation, reused directly in the report
├── .github/      CI workflows
└── README.md
```

Three deployables, one shared datastore. **The parts never call each other directly** — `web/` and
`worker/` both read and write the same Supabase Postgres database. There is no separate API server.

`web/` is named `web/`, not `frontend/`, because Next.js server components and server actions do
real server-side work in it. The names describe deployment units, not layers.

### worker/

```
worker/
├── scapers/
│   ├── sources/<source_name>/   one folder per source
│   └── pipeline/                fetch → clean → normalise → dedupe → store
├── matching/                    rules + scoring + explanation
├── data/                        fixtures, seed data
└── scripts/                     one-off verification and seeding scripts
```

A new source is a new folder under `scrapers/sources/` conforming to the shared pipeline
interface. Never special-case a source inside the pipeline.

### Environment

- `web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key,
  restricted by row-level security).
- `worker/.env` → `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service key — full write access, never
  exposed to the browser).
- Dev machine is a Mac with Conda active by default. `conda deactivate` before creating the worker
  venv. Supabase CLI installed via Homebrew.

---

## 5. Funding sources

**There is no usable public API anywhere on this source list.** This was verified, not assumed:
the EU Funding & Tenders Portal has no official grants API (TED covers procurement only, not NGO
grant calls), and its internal search endpoint is undocumented and unsuitable as a dependency.
Social- og Boligstyrelsen, DUF, Nordplus and the European Youth Portal likewise have none.
**"Scrape-or-manual" is the default assumption for every source.**

Agreed automated set (8), with PYN's recommended check frequency:

| # | Source | Level | Freq | Method / notes |
|---|---|---|---|---|
| 1 | Horsens Kommune | Municipal | Weekly | Sitemap at `horsens.dk/sitemap.xml`, filtered on `/fritid/soegstoette/`. Real `lastmod` timestamps enable cheap change detection. Server-rendered, robots-clear. **Soft-redirect trap: dead URLs return HTTP 200 and redirect to the section index — validate breadcrumbs in the parser.** §18-puljen links out to horsenssundby.dk for actual criteria (second hop). |
| 2 | Slots- og Kulturstyrelsen | National | Weekly | Best data quality on the list — filterable grants DB via URL params, sortable real deadlines, structured detail fields. Area codes: Børn og unge (16), Folkeoplysning (13), Internationalt (7). |
| 3 | Social- og Boligstyrelsen | National | Weekly | Aktuelle puljer portal. Quarterly *puljekalender* published as PDF — table parsing is real work. Yields PUF, SærligSoc. |
| 4 | DUF | National youth | Weekly | HTML plus per-pool PDFs. Initiativstøtten, Lokalforeningspuljen, Ungeløftepuljen. |
| 5 | Erasmus+ Programme Guide | EU | Annual round | Effectively a config document — parse once per annual round, don't crawl. Highest value to PYN. |
| 6 | EU Funding & Tenders Portal | EU | Weekly | Two-tier: automated slug-diff against the static topic index for CERV/AMIF detection; **manual enrichment for detail fields**, since topic pages are JS-rendered. |
| 7 | Nordplus | Nordic/Baltic | Annual | One deadline a year (~1 Feb); barely justifies automation. |
| 8 | European Youth Portal / ESC | EU | Weekly | Server-rendered. Volunteer placements are **not** organisational funding calls — verify relevance before this earns a scraper. ESC Quality Label is an accreditation gateway, not a grant. |

**Private foundations are handled by manual entry, not scrapers.** This is structural, not
laziness: they are mostly rolling, amounts "depend on the project", and several run an
inquiry-first process. They are poor scraping targets by nature. Seed 4–6 via manual entry
(Tuborgfondet, Spar Nord, Hempel, Lauritzen, Nordea-fonden) — this populates the `foundation`
funder type, exercises rolling-deadline handling, and demonstrates the manual-add fallback the
client brief explicitly asks for. Region Midtjylland likewise, or accept a documented `regional`
gap.

Checked and excluded: Salling Group API (retail, unrelated), Eurodesk (no API, duplicates existing
coverage), SALTO-YOUTH (training courses, not funding calls), CORDIS (completed projects only).

Everything beyond these is recorded in the report as **future development**, defensible under the
"only a selected number of relevant funding platforms" delimitation — as long as it's stated rather
than left looking like an oversight.

### Client-stated rules that bind the system (Funding Map §10)

- Store both open and closed recurring calls — closed calls are how the next cycle is predicted.
- **A thematic match must never override a hard eligibility rule.**
- Large EU/public calls should usually be recommended as a *partner* opportunity, not a lead
  application.
- For a newer NGO, a DKK 10,000–100,000 local grant can beat a €500,000 consortium call.
- Every record needs source URL, last-checked date and confidence level.
- Horsens is in **Region Midtjylland** — regional filters must use Midtjylland, never Syddanmark.

---

## 6. Matching engine

Lives in `worker/matching/`. Academically this is a **knowledge-based recommender system** — one of
the three canonical recommender families alongside collaborative filtering and content-based
approaches, and the correct choice for a cold-start, single-user, low-frequency domain. That
framing is what makes "AI" defensible at the exam without claiming ML.

Current rules, each returning points *and* a human-readable message:

1. **Theme overlap** — scored against PYN's six framings: local/community, youth, student, social,
   international, green.
2. **NGO eligibility** — hard block. A failure here is blocking and is never outweighed by theme
   score.
3. **Deadline feasibility** — time remaining vs. capacity to prepare.
4. **Partner burden** — required partners/countries vs. PYN's network.

Then: applicant-vs-partner recommendation (lead / partner / monitor only), language recommendation
(DA/EN with reason and manual override), and a confidence indicator derived from completeness of
the stored call data.

**`RuleResult` carries a `message` alongside its points — the engine cannot emit a score without an
explanation.** This is enforced in the type rather than by convention, so it can't quietly be
skipped. Never add a rule that returns a bare number.

### Evaluation


---

## 7. Scope

Backlog is 16 stories across six epics with MoSCoW priorities. Full text in the requirements
document; summary:

- **A — Central funding database:** automated ingestion (M), manual entry (M), edit/delete a call
  (M), duplicate handling (S), recurring calls and next cycle (S).
- **B — Search and decision support:** call detail view (M), search and filter (M), sorting (S),
  watchlist with priority/maybe-later/not-relevant states (M).
- **C — Organisational profile:** create and update the PYN profile (M).
- **D — Matching:** score and explanation (M), strengths/barriers/confidence (M), override a
  recommendation (S), applicant-vs-partner (S), maturity/complexity warning (C), language
  recommendation (S).
- **E — Notifications:** new relevant call alert (S), deadline reminders at ~3/2/1 months plus
  optional final (S), ingestion health / last-checked status (S).
- **F — Access:** authentication (undecided — if deferred, record it as a delimitation with a
  reason, don't just omit it).

Non-functional: modular sources without pipeline changes · maintainable by PYN after handover ·
GDPR for admin email addresses · a single source failing must not take the dashboard down · every
call carries source URL, last-checked date and confidence.

Stretch only, never blocking core scope: capacity check, complexity label, side-by-side comparison,
per-call notes, helpful/not-helpful feedback loop, call archive, next-step suggestion, narrative
framing recommendation per funder.

---

## 8. Risks

| Risk | Mitigation | Covered by |
|---|---|---|
| No usable APIs; sources restrict access | Verify access per source before building; manual-entry fallback | A2, E3 |
| Source changes structure and breaks ingestion | Isolate per-source parsing; a failing source must not abort the run | A3, E3, NFR4 |
| Silent scraper failure looks like a quiet week | Surface last-successful-run per source | E3 |
| Poor or misleading matches on thin data | Simple rules, confidence labels, manual override | D1, D2, D3 |
| Scope creep against a 900 h Construction budget | MoSCoW priorities; 8 sources not 17 | — |

---

## 9. Conventions for Claude in this repo

- **Prefer minimal runnable code over architecturally complete code.** At this stage a 20-line
  script that actually runs beats a layered implementation that's hard to read. Build up only when
  the simple version proves insufficient.
- **Verify before recommending.** Don't present a URL, endpoint or source behaviour as working
  unless it was actually tested. If something couldn't be checked (e.g. sandbox 403), say so
  explicitly rather than presenting it as verified.
- **Favour a working vertical slice** — source → storage → scoring → UI — over broad partial
  coverage. That's what gets graded and demoed.
- Keep explanations plain-language. Concrete examples over abstraction.
- For operational output (Jira titles, command lists), give the ready-to-paste version without
  surrounding prose.
- New source → new folder under `worker/scrapers/sources/`, conforming to the shared pipeline.
- Every match score ships with its reason. No exceptions.
- Don't silently widen the delimitations — non-EU/non-Danish sources, an ML model, multi-tenancy.
  Flag them as scope questions.
- `docs/` is written as a living artifact for direct reuse in the academic report, not as
  throwaway internal notes.

---

## 10. Open questions

- **Auth:** Supabase Auth vs. a single shared login vs. deferring it entirely.
- **PYN's real organisational profile** — still placeholder data.
- **Is CISU in or out?** It appeared in early planning but is absent from the client's funding map.
  Confirm with Dzeveckaite.
- **Terms-of-service check per scraped source** — not yet done.
- **ESC (source 8):** does volunteer-placement data have value to PYN, or should this narrow to
  Quality Label and Solidarity Projects only?
- **A.P. Møllerske Støttefond** is rated Strong in the client's §3 shortlist but missing from her §7
  monitoring list — oversight on her side?
- **Foundation coverage:** is their absence from automated ingestion acceptable for the delivered
  prototype, given they are seven of PYN's own top 15?