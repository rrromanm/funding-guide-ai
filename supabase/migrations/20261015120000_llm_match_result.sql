-- LLM scoring engine (docs/llm-scoring.md). Runs alongside the keyword matcher,
-- so it gets its own table: match_result is unique per call and carries the
-- keyword engine's review workflow, which the worker's upsert depends on.

-- The judge prompt needs these to rate maturity_fit and strategic_priority.
-- Nullable: nothing else reads them, and the prompt says so when they are empty.
alter table org_profile
  add column founded_year         int,
  add column strategic_priorities text;

update org_profile set founded_year = 2023 where id = 1;

create table llm_match_result (
  id               bigint primary key generated always as identity,
  call_id          bigint not null unique references funding_call on delete cascade,
  org_profile_id   int not null default 1 references org_profile,

  score            int  not null check (score between 0 and 100),
  fit_label        text not null check (fit_label in
                     ('strong_fit','possible_fit','weak_fit','not_recommended')),
  confidence       text not null check (confidence in ('high','medium','low')),
  blocking_reason  text,
  warnings         text[] not null default '{}',

  -- read and written whole, never queried into, hence jsonb over child tables
  criteria         jsonb not null,
  eligibility      jsonb not null,
  dropped_criteria jsonb not null,
  raw_response     jsonb not null,

  model            text not null,
  prompt_version   text not null,
  -- sha256 of call content + profile + prompt version; a mismatch means re-score
  input_hash       text not null,
  scored_at        timestamptz not null default now()
);

alter table llm_match_result enable row level security;

create policy admin_all on llm_match_result for all to authenticated
  using (is_admin()) with check (is_admin());
