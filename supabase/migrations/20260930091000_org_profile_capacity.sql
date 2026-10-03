-- Free-text description the admin maintains; nothing in the matching engine reads it.
alter table org_profile add column administrative_capacity text;

update org_profile
set administrative_capacity = 'Volunteer-run, no paid staff'
where id = 1;
