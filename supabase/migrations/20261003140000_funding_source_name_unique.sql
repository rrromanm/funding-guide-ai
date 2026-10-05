-- The scrapers upsert a source by its name now that the text key is gone.
alter table funding_source add constraint funding_source_name_key unique (name);
