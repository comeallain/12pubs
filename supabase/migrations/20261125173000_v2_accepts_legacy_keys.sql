-- join_crawl_v2: new identities must be device tokens (UUIDs), but a key
-- that's already on the guest list (the Nov email-keyed testers) may keep
-- using it to update their name. No new non-UUID keys can be created.
create or replace function public.join_crawl_v2(p_key text, p_name text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare k text := lower(trim(coalesce(p_key,''))); n text := left(trim(coalesce(p_name,'')), 40); g public.guests;
begin
  if n = '' then return json_build_object('ok', false, 'reason', 'no_name'); end if;
  select * into g from public.guests where email = k;
  if g.email is not null and g.blocked then return json_build_object('ok', false, 'reason', 'axed'); end if;
  if g.email is null and k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return json_build_object('ok', false, 'reason', 'bad_key');
  end if;
  insert into public.guests(email, name) values (k, n)
  on conflict (email) do update set name = excluded.name
  returning * into g;
  return json_build_object('ok', true, 'name', g.name);
end $$;
