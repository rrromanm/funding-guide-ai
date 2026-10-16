--   criterion:   label = criterion key, rating 0-4, weight, evidence, message = reason;
--                grounded = false means dropped by the grounding check (0 points)
--   eligibility: label = requirement, verdict yes/no/unclear, evidence, message = reason, grounded
--   warning:     message only (what lowered confidence)
create table match_reason (
  id        bigint primary key generated always as identity,
  match_id  bigint not null references match_result on delete cascade,
  kind      text not null check (kind in ('criterion','eligibility','warning')),
  label     text,
  message   text not null,
  weight    int  not null default 0,
  rating    int  check (rating between 0 and 4),
  verdict   text check (verdict in ('yes','no','unclear')),
  evidence  text,
  grounded  boolean
);

create index on match_reason (match_id);

alter table match_reason enable row level security;

create policy admin_all on match_reason for all to authenticated
  using (is_admin()) with check (is_admin());

insert into match_reason (match_id, kind, label, message, weight, rating, evidence, grounded)
select m.id, 'criterion', c->>'key', c->>'reason', (c->>'weight')::int, (c->>'rating')::int, c->>'evidence', true
from match_result m, jsonb_array_elements(m.criteria) c
union all
select m.id, 'criterion', c->>'key', c->>'reason', (c->>'weight')::int, (c->>'rating')::int, c->>'evidence', false
from match_result m, jsonb_array_elements(m.dropped_criteria) c;

insert into match_reason (match_id, kind, label, message, verdict, evidence, grounded)
select m.id, 'eligibility', e->>'requirement', e->>'reason', e->>'pynMeets', e->>'evidence', (e->>'grounded')::boolean
from match_result m, jsonb_array_elements(m.eligibility) e;

insert into match_reason (match_id, kind, message)
select m.id, 'warning', w
from match_result m, unnest(m.warnings) w;

alter table match_result
  drop column criteria,
  drop column eligibility,
  drop column dropped_criteria,
  drop column warnings;
