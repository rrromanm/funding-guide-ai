-- The LLM engine replaces the keyword matcher (docs/llm-scoring.md). Its table
-- takes over the match_result name and the admin-review columns, so calls,
-- sources and notifications keep reading match_result unchanged.
--
-- Destructive: the keyword engine's scores and reasons are dropped. No match
-- had been reviewed and no notification written when this ran.

alter table notification drop constraint notification_match_id_fkey;

drop table match_reason;
drop table match_result;

alter table llm_match_result rename to match_result;

alter table match_result
  add column review_status review_status not null default 'generated',
  add column manual_score  int check (manual_score between 0 and 100),
  add column admin_note    text;

alter table notification
  add constraint notification_match_id_fkey
    foreign key (match_id) references match_result on delete cascade;
