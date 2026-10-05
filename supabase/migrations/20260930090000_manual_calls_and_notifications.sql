-- Fields only an admin fills in by hand; the scrapers never produce them.
alter table funding_call
  add column target_groups           text[] not null default '{}',
  add column recurring               boolean not null default false,
  add column expected_reopening_date date,
  alter column source_url drop not null;

alter table funding_round add column title text;

-- Calls added through the API hang off this source.
insert into funding_source (key, name, source_type)
values ('manual', 'Added by hand', 'manual')
on conflict (key) do nothing;

-- Notifications are derived from relevant matches, so only the read flag is stored.
alter table match_result add column notification_read_at timestamptz;
