# LLM scoring engine

Funding Guide AI scores every funding call against PYN's profile with an LLM judge and a deterministic formula.

| | |
| --- | --- |
| Code | `api/src/modules/matches/` (TypeScript) |
| Runs | `npm run score:llm` (from `api/`) |
| Stores in | `match_result` |
| Served by | `GET /api/calls` (`score`, `fitLabel`) and `GET /api/calls/:id` (also `confidence`, `blockingReason`, `reasons`). The per-criterion breakdown stays in `raw_response`. |

## Why

It replaced a rule-based keyword engine (`worker/matching/`, removed on 2026-10-15). The keyword engine counted
theme keywords in a call's text and could not read a restriction. **Musikerpuljen**
(call #72, Statens Kunstfond) says *"Hvem kan søge? Professionelle musikgrupper – herunder orkestre, bands, kor og
ensembler"*, so only professional music groups may apply. The keyword engine still scored it around 70/100 for
PYN, a volunteer youth NGO, because the text shares words with PYN's themes.

The LLM engine reads the whole call the way a person would. It checks eligibility first and rates fit on a small
fixed scale. The 0–100 score is then computed **in code** from those ratings, so the score is deterministic,
explainable and auditable.

### Keyword engine vs LLM engine (2026-10-15)

Both engines scored the same 92 calls before the keyword engine was removed. The LLM run used
`gemini-3.5-flash-lite` with the first prompt draft:

| | Keyword engine | LLM engine |
| --- | --: | --: |
| Strong or possible fit | 51 | 12 |
| Blocked by an eligibility requirement | — | 62 |

17 calls the keyword engine rated `strong_fit` were blocked by the LLM. Most of them are calls PYN cannot apply
to: work grants for individual artists, pools only municipalities, publishers or licensed local-radio stations can
apply to, a pool for political parties, Sydslesvig-only funds. Only one call moved up (#45 Forfattermøder for
voksne, 15 → 69, low confidence). That draft on Flash Lite also over-blocks: of the 62 blocks, at least 4 are wrong
(#6, #34, #37, #43). It treats requirements PYN could meet, or a theme mismatch, as an eligibility "no". On the 8
calls also scored by `gemini-3.8-flash`, the two models agreed on both genuine blocks, and 3.8 Flash did not
block #6.

### How the prompt was developed

Two drafts came before the current prompt (`v1`). Their files are deleted; the findings below remain.

| Version | Change | Why |
| --- | --- | --- |
| draft 1 | first version | |
| draft 2 | `no` only for what PYN is; project conditions and missing information are `unclear`; theme is never eligibility; PYN's age in years and building ownership in the profile | On Flash Lite, draft 1 wrongly blocked at least 7 of 62 calls (#6, #34, #37, #43, #70, #75, #122). Examples: holding an event in Brædstrup, a venue agreement, "existed ≥ 2 years" misread for a 3-year-old organisation. |
| v1 (current) | draft 2, with `strategic_priority` replaced by `complexity` (administrative burden); `maturity_fit`, `project_scale` and `partner_burden` name the checks from PYN's list of recommended matching fields | `strategic_priority` came from the original spec, not from PYN. PYN states no priorities, so it fell back to themes and gave theme 35 points instead of 25. PYN's list asks for complexity instead. |

A draft 2 spot check on 12 calls fixed all 7 wrong blocks (scores 36–60) and kept all 5 genuine ones: #72
professional musicians, #4 schools only, #33 political parties, #48 individual artists, #19 building owners.

Full draft 2 run on all 92 calls (`gemini-3.5-flash-lite`, 2026-10-15): 2 `strong_fit`, 23 `possible_fit`, 11
`weak_fit`, 56 `not_recommended` (54 of them blocked by eligibility). Confidence: 11 high, 38 medium, 43 low. Most
possible fits are low confidence because they carry "unclear" requirements for the admin to check. Known errors
remain on both sides. #18 Oplandspuljen ("Bor du i … en landsby") restricts where the applicant lives but was read
as a project location, so it is not blocked. #60 is blocked although its list of applicants ends with "og andre,
der har interesse i …" (and others who are interested in …).

## Requirements it satisfies

- **D1, explainable:** every rating carries a one-sentence reason and an exact quote from the call text. A blocked
  call shows the requirement that blocked it.
- **D2, eligibility first:** any eligibility requirement PYN clearly fails sets the score to 0 and the label to
  `not_recommended`, however good the thematic fit.
- **Zero cost:** the engine uses Google Gemini's free tier through an AI Studio API key, behind a small provider
  interface (`api/src/lib/llm.ts`) so Groq or another free provider can replace it.

## Pipeline

```
funding_call + funding_round ──┐
                               ├─► formatted text ─► input_hash ─► unchanged? skip
org_profile + tags ────────────┘                         │
                                                          ▼
                                        judge prompt (prompt.v1.ts) ─► Gemini (JSON mode)
                                                          │
                                                          ▼
                                    Zod validation (judgeOutput) ─► grounding check
                                                          │
                                                          ▼
                                    aggregation (score, label, confidence) ─► match_result
```

1. **Inputs.** `loadCalls()` turns each `funding_call` row and its rounds into one plain-text block: title,
   funding body, level, status, budget, rounds, summary and the full scraped `description`. The worker stores the
   whole cleaned page text in `description` (median ~5.9k characters, maximum ~16k), so the model reads everything
   a person would. `loadProfileText()` does the same for PYN's `org_profile` row and its tags. It states PYN's age in
   years and whether it owns buildings (an `other` tag named `facilities`), because eligibility rules ask exactly
   that. The engine only reads from the database.
2. **Judge prompt** (`prompt.v1.ts`, `PROMPT_VERSION = "v1"`). The model gets today's date, the profile and the
   call. It must:
   - **Step 1, eligibility:** list every requirement on *who* may apply, plus hard project conditions. Each one
     needs a verbatim quote in the call's original language (often Danish), `pyn_meets` = `yes` / `no` /
     `unclear`, and a reason. `no` is reserved for what kind of applicant PYN *is*: applicant type, legal form,
     where it is based, its age, or something it must own or hold. Conditions PYN could meet by how it runs a
     project are `unclear`, and so is anything the profile says nothing about. A theme mismatch is never an
     eligibility `no`.
   - **Step 2, criteria:** only after step 1, rate seven criteria 0–4, each with a quote and a one-sentence
     reason. When the call is silent on a criterion, the quote is `null` and the rating must be 2.
   - **Step 3, key points:** 2–4 short sentences summarising the answers above, most important first, each a
     `blocker`, `barrier`, `strength` or `info` and tied to a criterion or to eligibility. No scores or labels:
     the code owns those. The model writes them before the score exists, so `keyPointsFor()` drops any the final
     result contradicts: points about a dropped criterion, strengths on a blocked call, and "blockers" on a call
     nothing blocks (demoted to barriers). A blocked call always leads with a blocker.

   The response is constrained to JSON by Gemini's `responseJsonSchema`, generated from the same Zod schema that
   validates it (`judgeOutput` in `matches.schema.ts`). Temperature is 0.
3. **Grounding check** (`groundCheck()` in `matches.scoring.ts`). Every quote must appear in the call text
   after both are normalised: Unicode NFKC, lower case, whitespace collapsed, typographic dashes and quotes made
   plain, and wrapping quote marks or trailing full stops trimmed. Then:
   - A **criterion** whose quote is not found is **dropped**. It scores 0 points and is recorded in
     `dropped_criteria` with the reason. A `null` quote means "the call says nothing about this". That is not a
     failure, so the rating is kept.
   - An **eligibility** entry whose quote is not found is marked `grounded: false`. If it said `no`, it is
     demoted to `unclear`, so an invented quote can never zero a call.
4. **Aggregation** (`aggregate()`), described below.
5. **Storage.** The result is upserted into `match_result`, one row per call, and its key points replace the call's `match_reason` rows. The upsert never writes the review
   columns, so an admin's override or dismissal survives a re-score.

## Scoring formula

Weights live in `matches.config.ts` and sum to 100:

| Criterion | Weight | What 4 means |
| --- | --: | --- |
| `theme_match` | 25 | The call's purpose matches PYN's themes |
| `target_group` | 20 | Its beneficiaries are PYN's target groups |
| `maturity_fit` | 15 | Suitable for a newer NGO (2 = needs evidence of earlier projects, 0 = needs an experienced coordinator) |
| `project_scale` | 10 | Grant size, co-financing share and project duration suit PYN's capacity |
| `partner_burden` | 10 | No required partners (minimum organisations or countries, municipality, education partner) |
| `complexity` | 10 | Low administrative burden for applying and reporting |
| `deadline_readiness` | 10 | Open with ample time, or rolling |

Each criterion earns

$$\text{points}_c = \frac{\text{rating}_c}{4} \times \text{weight}_c \qquad \text{score} = \operatorname{round}\Big(\sum_{c\ \text{kept}} \text{points}_c\Big)$$

Dropped criteria contribute 0. Their weight is not redistributed, which keeps the scoring conservative.

**Eligibility override:** if any eligibility entry is `no` (and grounded), then score = 0, label =
`not_recommended`, and `blocking_reason` holds the requirement, its quote and the model's reason. An `unclear`
entry does not change the score. It adds a warning and lowers confidence.

**Labels** (thresholds in config):

| Score | Label |
| --- | --- |
| ≥ 75 | `strong_fit` |
| 50–74 | `possible_fit` |
| 25–49 | `weak_fit` |
| < 25 | `not_recommended` |

**Confidence** counts *issues*: eligibility answers that are `unclear`, plus criteria dropped by the grounding
check, plus missing call data (description shorter than 500 characters, no deadline on a non-recurring call, no
budget).

| Issues | Confidence |
| --: | --- |
| 0 | high |
| 1–2 | medium |
| ≥ 3 | low |

Each issue is also described in plain language in the result's `warnings` (not stored).

### Worked example: Musikerpuljen (#72)

The model finds the restriction *"Professionelle musikgrupper – herunder orkestre, bands, kor og ensembler"* with
`pyn_meets: "no"`. The quote is in the text, so the override applies: **score 0, `not_recommended`**, with that
requirement as the reason. This holds even if the criteria ratings would have summed to 60 or more. The test
`musician fixture` in `api/test/matches.test.ts` runs this case against the real call text with a mocked model.

## Storage: `match_result` and `match_reason`

Storage follows the domain model: a `MatchResult` contains `MatchReason`s. The LLM engine first ran in its own
`llm_match_result` table, next to the keyword engine's `match_result`, so the two could be compared. When the
keyword engine was removed, the LLM table took over `match_result` and its admin-review columns, so the calls,
sources and notifications endpoints read it unchanged. `match_reason` holds the score's summary: one row per key
point, using the domain model's `kind` and `message` plus a `label` for what the point is about.

`match_result`, one row per call:

| Column | Contents |
| --- | --- |
| `call_id` (unique) | the call |
| `score`, `fit_label`, `confidence` | the computed result |
| `blocking_reason` | why it was blocked |
| `raw_response` (jsonb) | the model's output exactly as returned, for auditing |
| `model`, `prompt_version` | what produced it |
| `input_hash` | sha256 of call text + profile text + prompt version + model |
| `scored_at` | when |
| `review_status`, `manual_score`, `admin_note` | the admin's review; `GET /api/calls` shows `manual_score` over `score` |

`match_reason`, many per result:

| `kind` | `label` | `message` |
| --- | --- | --- |
| `blocker` / `barrier` / `strength` / `info` | the criterion, or `eligibility` | the key point, shown next to the score |

The per-criterion ratings, eligibility checks and warnings are used to compute the score but are not stored as
rows. The model's full answer, quotes included, stays in `raw_response`.

A re-score replaces the result and all its reasons in one transaction. The upsert never writes the review
columns, so an admin's review survives.

### When a call is re-scored

`input_hash` is computed over the *formatted* call and profile text the model sees, plus `PROMPT_VERSION` and the
model name. The job re-scores a call when it has no row, or when the stored hash differs from the current one. That covers:

- **the call changed** (text, rounds, budget, status);
- **the profile changed** (any field or tag);
- **the prompt changed** (bump `PROMPT_VERSION`);
- **the model changed** (`GEMINI_MODEL`), so every stored result comes from one model.

Timestamps are not used. The worker rewrites `funding_call.updated_at` on every scrape even when nothing
changed, and `org_profile` has no `updated_at`. The date passed to the prompt is not hashed, so
`deadline_readiness` is not refreshed daily. It refreshes whenever the call changes.

## Running the job

```bash
cd api
# one-time: add a free key from https://aistudio.google.com/apikey to api/.env
#   GEMINI_API_KEY=...
#   GEMINI_MODEL=gemini-3.5-flash-lite  (optional; this is the default)
#   GEMINI_RPM=15                       (optional; the model's requests/minute)

npm run score:llm                  # score every new or stale call
npm run score:llm -- --call 72     # score one call (always re-scores it)
npm run score:llm -- --limit 10    # at most 10 calls this run
```

The job is idempotent. It skips unchanged calls, so running it again costs nothing. Requests are paced by
`GEMINI_RPM`, the model's free-tier requests per minute (default 15, the limit for Gemini 3.5 Flash Lite;
check *AI Studio → Rate limits*). A full run of 92 calls takes about 25 minutes, mostly model latency. A `429` or `5xx` is retried up to 5 times, waiting for the delay Gemini returns in
`RetryInfo` or else 2 s, 4 s, 8 s and so on. A call that still fails is logged and left for the next run.

**Daily quota.** The free tier also caps requests per day: 500 for Gemini 3.5 Flash Lite, but only 20 for
Gemini 3.8 Flash, at the time of writing. When Gemini reports that the per-day quota is spent, retrying cannot
help, so the job stops and leaves the remaining calls for the next run. Run it again the next day until
everything is scored. After that, only new or changed calls use
quota. The exit code is non-zero if any call failed. A full run is too long for a Vercel function, which is why
the job is a script.

Then read a result:

```sql
select score, fit_label, confidence, blocking_reason, criteria from match_result where call_id = 72;
```

### Swapping the provider

`LlmProvider` is `{ model, generateJson(prompt, jsonSchema) }`. To use Groq or another free tier, write a function
returning that shape (`withRetry` from `lib/llm.ts` handles back-off) and pass it in place of `geminiProvider` in
`src/scripts/score-calls.ts`. Note that the free Gemini tier may use prompts to improve Google's models. The
inputs here are public call texts and PYN's public profile.

## Changing the engine

| To change | Edit | Effect |
| --- | --- | --- |
| weights, thresholds, confidence | `matches.config.ts` | new results only; re-score with `--call` or bump the prompt version to apply to all |
| prompt wording | copy the latest to `prompt.v<N+1>.ts`, bump `PROMPT_VERSION`, import it in the service (and the test) | every call re-scored on the next run |
| PYN's profile | `org_profile` / tags (`founded_year` feeds eligibility and `maturity_fit`) | every call re-scored on the next run |

## Tests

`api/test/matches.test.ts` never calls the real API. It covers weights summing to 100, the points formula,
the eligibility override, `unclear` handling, label thresholds, confidence, the grounding check (normalisation,
dropped criteria, `null` evidence, demoting an invented `no`), the Musikerpuljen fixture, schema rejection,
retry/back-off, stopping on the daily quota, and Gemini response parsing, plus the breakdown endpoint.
