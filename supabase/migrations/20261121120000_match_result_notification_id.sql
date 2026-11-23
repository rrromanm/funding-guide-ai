delete from notification;

alter table match_result
  add column notification_id bigint references notification on delete set null;

create index on match_result (notification_id);
