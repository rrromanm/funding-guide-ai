-- Brings the schema in line with the domain model in docs/.
--
-- Destructive: every scraped row is deleted and every column the model does not
-- have is dropped. The scrapers repopulate funding_call once the pipeline is
-- updated to the new shape. org_profile is kept -- it is typed in by hand.

---------------------------------------------------------------- wipe
-- cascades to funding_round, match_result and match_reason
delete from funding_call;

---------------------------------------------------------------- Tag
create type tag_type as enum ('theme', 'target_group', 'sector', 'country', 'other');

create table tag (
  id    bigint primary key generated always as identity,
  label text not null,
  type  tag_type not null,
  unique (label, type)
);

create table funding_call_tag (
  call_id bigint not null references funding_call on delete cascade,
  tag_id  bigint not null references tag on delete cascade,
  primary key (call_id, tag_id)
);

create table org_profile_tag (
  org_profile_id int not null references org_profile on delete cascade,
  tag_id         bigint not null references tag on delete cascade,
  primary key (org_profile_id, tag_id)
);

create index on funding_call_tag (tag_id);
create index on org_profile_tag (tag_id);

-- the profile's funding_theme[] / target_groups / dk_region become tag rows
insert into tag (label, type)
select distinct unnest(themes)::text, 'theme'::tag_type from org_profile
union
select distinct unnest(target_groups), 'target_group'::tag_type from org_profile
union
select distinct region::text, 'other'::tag_type from org_profile;

insert into org_profile_tag (org_profile_id, tag_id)
select p.id, t.id
from org_profile p
cross join unnest(p.themes) as th
join tag t on t.label = th::text and t.type = 'theme';

insert into org_profile_tag (org_profile_id, tag_id)
select p.id, t.id
from org_profile p
cross join unnest(p.target_groups) as tg
join tag t on t.label = tg and t.type = 'target_group';

insert into org_profile_tag (org_profile_id, tag_id)
select p.id, t.id
from org_profile p
join tag t on t.label = p.region::text and t.type = 'other';

---------------------------------------------------------------- FundingSource
-- text key -> surrogate int id, and funding_call.source -> funding_source_id
alter table funding_source add column id bigint generated always as identity;

-- dropping the column takes the FK, the unique (source, source_url) and the index
alter table funding_call drop column source;
alter table funding_call add column funding_source_id bigint not null;

alter table funding_source
  drop constraint funding_source_pkey,
  drop column key,
  drop column created_at,
  add primary key (id);

alter table funding_call
  add constraint funding_call_funding_source_id_fkey
    foreign key (funding_source_id) references funding_source,
  -- the scrapers' upsert key, in place of the old (source, source_url).
  -- Null source_url (a hand-typed call) stays allowed: Postgres treats nulls
  -- as distinct in a unique constraint.
  add constraint funding_call_funding_source_id_source_url_key
    unique (funding_source_id, source_url);

create index on funding_call (funding_source_id);

---------------------------------------------------------------- FundingCall
alter table funding_call
  add column budget_min  numeric,
  add column budget_max  numeric,
  add column currency    text not null default 'DKK',
  add column external_id text,

  drop column confidence,     -- generated from completeness, so it goes first
  drop column completeness,
  drop column amounts_kr,
  drop column content_hash,
  drop column deadline_type,
  drop column last_checked,
  drop column missing_fields,
  drop column municipality,
  drop column region,
  drop column themes,
  drop column target_groups,  -- target groups are tags in the model
  drop column record_kind,
  -- the model keeps the reopening date on the round, as expected_next_open_date
  drop column expected_reopening_date;

-- status becomes a real enum, like review_status, because the model draws it as one
create type call_status as enum ('upcoming', 'open', 'closed', 'unknown');

alter table funding_call drop constraint funding_call_status_check;
alter table funding_call
  alter column status drop default,
  alter column status type call_status using status::call_status,
  alter column status set default 'unknown';

---------------------------------------------------------------- FundingRound
alter table funding_round drop column title;

---------------------------------------------------------------- OrgProfile
alter table org_profile rename column municipality to city;
alter table org_profile rename column administrative_capacity to admin_capacity;

alter table org_profile
  drop column region,            -- kept as an 'other' tag above
  drop column has_facilities,
  drop column established_year,
  drop column themes,            -- now org_profile_tag
  drop column target_groups,     -- now org_profile_tag
  drop column updated_by,
  drop column updated_at,
  drop column created_at;

---------------------------------------------------------------- MatchResult
alter table match_result
  add column updated_at     timestamptz not null default now(),
  add column org_profile_id int not null default 1 references org_profile,
  drop column manual_fit_label,
  -- replaced by notification.read below
  drop column notification_read_at;

alter table match_reason drop column rule_key;

---------------------------------------------------------------- Notification
create table notification (
  id         bigint primary key generated always as identity,
  match_id   bigint not null references match_result on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index on notification (match_id);
create index on notification (read) where not read;

---------------------------------------------------------------- RLS
alter table tag              enable row level security;
alter table funding_call_tag enable row level security;
alter table org_profile_tag  enable row level security;
alter table notification     enable row level security;

create policy admin_all on tag for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on funding_call_tag for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on org_profile_tag for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on notification for all to authenticated
  using (is_admin()) with check (is_admin());
