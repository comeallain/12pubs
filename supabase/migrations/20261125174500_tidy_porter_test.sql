delete from public.checkins where email in (select email from public.guests where name = 'Porter Test');
delete from public.guests where name = 'Porter Test';
