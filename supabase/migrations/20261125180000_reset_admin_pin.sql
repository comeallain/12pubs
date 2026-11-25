-- Admin PIN reset, applied 2026-11-25. The actual value was applied to the
-- database directly and is deliberately not in this public file; the full
-- statement lives only in the project's own migration history table.
-- Shape: update public.settings
--          set value = extensions.crypt('<pin>', extensions.gen_salt('bf'))
--        where key = 'admin_pin';
select 1;
