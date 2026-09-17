alter table funding_call drop column confidence;
alter table funding_call add column confidence text generated always as (
  case when completeness is null then null
       when completeness >= 0.9 then 'high'
       when completeness >= 0.7 then 'medium'
       else 'low' end) stored;
