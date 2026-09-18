create type funding_theme as enum
  ('local_community','youth','student','social','international','green');
create type dk_region as enum
  ('Hovedstaden','Sjælland','Syddanmark','Midtjylland','Nordjylland');

alter table funding_call
  add column themes       funding_theme[] not null default '{}',
  add column region       dk_region,
  add column municipality text,
  drop column other_urls,
  drop column application_language;

create table org_profile (
  id  int primary key check (id = 1),
  name         text not null,

  legal_status text not null check (legal_status in
                 ('nonprofit_association','foundation','company','informal_group')),
  country      text not null check (country = 'DK'),
  region       dk_region not null,
  municipality text not null,
  has_facilities boolean not null,
  established_year int,

  staff_count  int not null check (staff_count >= 0),

  themes         funding_theme[] not null,
  target_groups  text[] not null,

  updated_by   uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null,
  created_at   timestamptz not null
);

insert into org_profile (
  id, name, legal_status, country, region, municipality,
  has_facilities, established_year, staff_count,
  themes, target_groups,
  updated_by, updated_at, created_at
) values (
  1,
  'Pangaea Youth Network',
  'nonprofit_association',
  'DK',
  'Midtjylland',
  'Horsens',
  true,
  2023,
  0,
  '{local_community,youth,student,social,international,green}',
  '{"young people","international students","newcomers and migrants","volunteers","socially isolated youth"}',
  null,
  now(),
  now()
);

create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb
                  -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

alter table org_profile    enable row level security;
alter table funding_source enable row level security;
alter table funding_call   enable row level security;
alter table funding_round  enable row level security;

create policy admin_read   on org_profile for select to authenticated using (is_admin());
create policy admin_update on org_profile for update to authenticated
  using (is_admin()) with check (is_admin());

create policy admin_all on funding_source for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on funding_call for all to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_all on funding_round for all to authenticated
  using (is_admin()) with check (is_admin());
