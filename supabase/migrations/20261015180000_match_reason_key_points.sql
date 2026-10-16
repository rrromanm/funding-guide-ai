alter table match_reason drop constraint match_reason_kind_check;

alter table match_reason add constraint match_reason_kind_check check (kind in (
  'criterion', 'eligibility', 'warning', 
  'blocker', 'barrier', 'strength', 'info' 
));
