-- Requirement 2 needs a source for calls typed in by hand. 20260930090000 inserted
-- one, but the remote ended up without the row, so re-insert it by name.
insert into funding_source (name, source_type)
values ('Added by hand', 'manual')
on conflict (name) do nothing;
