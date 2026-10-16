delete from match_reason where kind in ('criterion', 'eligibility', 'warning');

alter table match_reason
  drop column rating,
  drop column verdict,
  drop column evidence,
  drop column grounded,
  drop column weight;

alter table match_reason drop constraint match_reason_kind_check;

alter table match_reason add constraint match_reason_kind_check
  check (kind in ('blocker', 'barrier', 'strength', 'info'));
