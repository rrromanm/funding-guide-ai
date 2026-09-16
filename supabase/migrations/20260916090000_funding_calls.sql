create table funding_source (
  key          text primary key, 
  name         text not null,
  source_type  text,
  base_url     text,
  active       boolean not null default true,
  last_checked timestamptz,
  created_at   timestamptz not null default now()
);

create table funding_call (
  id           bigint primary key generated always as identity,
  source       text not null references funding_source,
  source_url   text not null,
  -- the page this call lives on: re-scraping it updates this row instead of adding one
  unique (source, source_url),
  -- dedupe() already merged sightings by content_hash before anything reaches the DB, so
  -- this is change detection, not a constraint: same fund, edited page -> new hash, same row.
  content_hash text not null,
  -- the other URLs dedupe() saw this same call at (same fund on two pages)
  other_urls   text[] not null default '{}',

  title        text not null,
  summary      text,
  description  text,
  funding_body text,

  level        text check (level in ('local','municipal','regional','national','nordic','eu')),
  funder_type  text check (funder_type in ('public_pool','foundation','eu_programme','other')),

  status       text not null default 'unknown'
                 check (status in ('upcoming','open','closed','unknown')),
  -- the cycle axis, orthogonal to status: a rolling pool is open with no deadline,
  -- a multi_round one is how the next cycle gets predicted
  deadline_type text not null default 'unknown'
                 check (deadline_type in ('fixed','multi_round','rolling','unknown')),

  -- every DKK figure found on the page, in reading order. Kept raw rather than as
  -- min/max because pages mix grant ceilings with unrelated numbers.
  amounts_kr   integer[] not null default '{}',

  eligibility  text,
  ngo_eligible boolean,

  -- not every scraped page is a call: some are section indexes, some are near-empty stubs
  record_kind  text not null default 'call' check (record_kind in ('call','stub','info_page')),
  application_language text,

  last_checked timestamptz,
  -- which modelled fields the scrape could not fill, and that as a 0-1 ratio.
  -- confidence is derived from it so a score can never be stored without its reason.
  missing_fields text[] not null default '{}',
  completeness numeric,
  confidence   text generated always as (
                 case when completeness is null then null
                      when completeness >= 0.6 then 'high'
                      when completeness >= 0.4 then 'medium'
                      else 'low' end) stored,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on funding_call (status);
create index on funding_call (source);
create index on funding_call (content_hash);

create table funding_round (
  id                      bigint primary key generated always as identity,
  call_id                 bigint not null references funding_call on delete cascade,
  round_no                int,
  open_date               date,
  deadline_date           date,
  decision_date           date,
  expected_next_open_date date,
  unique (call_id, round_no)
);

create index on funding_round (deadline_date);

