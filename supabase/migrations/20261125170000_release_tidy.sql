-- Remove the release-day smoke-test guests. Real crew rejoin name-only.
delete from public.checkins where email in (
  select email from public.guests where name in ('Smoke Test','Smoke Kev'));
delete from public.guests where name in ('Smoke Test','Smoke Kev');
