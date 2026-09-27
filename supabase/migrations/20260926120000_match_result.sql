create type review_status as enum ('generated', 'overridden', 'dismissed');

create table match_result (
  id            bigint primary key generated always as identity,
  call_id       bigint not null unique references funding_call on delete cascade,

  score         int  not null check (score between 0 and 100),
  fit_label     text not null check (fit_label in
                  ('strong_fit','possible_fit','weak_fit','not_recommended')),

  review_status review_status not null default 'generated',
  manual_fit_label text check (manual_fit_label in
                  ('strong_fit','possible_fit','weak_fit','not_recommended')),
  manual_score  int check (manual_score between 0 and 100),
  admin_note    text,

  created_at    timestamptz not null default now()
);

create table match_reason (
  id        bigint primary key generated always as identity,
  match_id  bigint not null references match_result on delete cascade,
  kind      text not null check (kind in ('blocker','barrier','strength','info')),
  rule_key  text not null,
  message   text not null,
  weight    int  not null default 0
);

create index on match_reason (match_id);

alter table match_result enable row level security;
alter table match_reason enable row level security;

create policy admin_all on match_result for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on match_reason for all to authenticated
  using (is_admin()) with check (is_admin());
