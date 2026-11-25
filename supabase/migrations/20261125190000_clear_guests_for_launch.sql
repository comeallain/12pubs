-- Fresh start for launch on 12pubs.eu: clear every guest and check-in from
-- the trial runs. Everyone joins again with just a name at the door.
delete from public.checkins;
delete from public.guests;
