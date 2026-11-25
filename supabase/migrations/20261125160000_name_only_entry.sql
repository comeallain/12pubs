-- Name-only entry: the guests key becomes an opaque device token (a UUID the
-- phone generates and keeps), the typed name is display-only, and no email is
-- ever asked for or stored. Old email-keyed test rows keep working until
-- they're tidied; email signup itself is retired.

-- 1. The key no longer has to look like an email: drop the check constraint(s).
do $$ declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.guests'::regclass and contype = 'c'
  loop
    execute format('alter table public.guests drop constraint %I', c);
  end loop;
end $$;

-- 2. Join with a device token + required display name. No email path.
create or replace function public.join_crawl_v2(p_key text, p_name text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare k text := lower(trim(coalesce(p_key,''))); n text := left(trim(coalesce(p_name,'')), 40); g public.guests;
begin
  if k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return json_build_object('ok', false, 'reason', 'bad_key');
  end if;
  if n = '' then return json_build_object('ok', false, 'reason', 'no_name'); end if;
  select * into g from public.guests where email = k;
  if g.email is not null and g.blocked then return json_build_object('ok', false, 'reason', 'axed'); end if;
  insert into public.guests(email, name) values (k, n)
  on conflict (email) do update set name = excluded.name
  returning * into g;
  return json_build_object('ok', true, 'name', g.name);
end $$;
revoke all on function public.join_crawl_v2(text,text) from public, authenticated;
grant execute on function public.join_crawl_v2(text,text) to anon;

-- Email signup is retired.
revoke execute on function public.join_crawl(text,text) from anon;

-- 3. State with everyone's check-ins, for the shared scoreboard.
--    (v3 returned only the caller's; the whole point of the night is seeing
--    who's behind.) Otherwise identical to crawl_state_v3.
create or replace function public.crawl_state_v4(p_email text, p_pin text default null)
returns json language plpgsql security definer set search_path to 'public' as $f$
declare g public.guests; preview boolean := false; open_now boolean; t timestamp := public._dublin_now();
  base_crawl json; base_people json; base_drops json;
begin
  select * into g from public.guests where email = lower(trim(p_email));
  if g.email is null or g.blocked then raise exception 'not_on_list' using errcode = '28000'; end if;
  if p_pin is not null then preview := public._admin(p_pin); end if;
  open_now := t >= public._drop_at(12);
  base_crawl := (select json_object_agg(key, value) from public.settings where key in ('date','start','title','last_orders'));
  base_people := (select coalesce(json_agg(json_build_object('who', coalesce(name, split_part(email,'@',1)), 'me', email = g.email) order by added_at), '[]'::json)
                  from public.guests where not blocked);
  base_drops := (select json_agg(to_char(public._drop_at(s), 'YYYY-MM-DD"T"HH24:MI:SS') order by s) from generate_series(1, 12) s);
  if not (open_now or preview) then
    return json_build_object('locked', true,
      'me', json_build_object('name', g.name),
      'crawl', base_crawl, 'people', base_people, 'drops', base_drops,
      'revealed', (select coalesce(json_agg(json_build_object('slot', r.slot, 'pub', to_jsonb(p) - 'role') order by r.slot), '[]'::json)
                   from public.route r join public.pubs p on p.id = r.pub_id where public._drop_at(r.slot) <= t));
  end if;
  return json_build_object('locked', false, 'preview', preview and not open_now,
    'me', json_build_object('name', g.name),
    'crawl', base_crawl, 'people', base_people, 'drops', base_drops,
    'route', (select json_agg(json_build_object(
        'slot', r.slot, 'swapped_from', case when r.pub_id <> r.original_pub_id then o.name end,
        'opens_at', to_char(public._slot_opens(r.slot), 'YYYY-MM-DD"T"HH24:MI'),
        'pub', to_jsonb(p) - 'role') order by r.slot)
      from public.route r join public.pubs p on p.id = r.pub_id join public.pubs o on o.id = r.original_pub_id),
    'subs', (select json_agg(to_jsonb(p) - 'role' order by p.name) from public.pubs p where p.role = 'sub'
             and p.id not in (select pub_id from public.route)),
    'after', (select to_jsonb(p) - 'role' from public.pubs p where p.role = 'after' limit 1),
    'checkins', (select coalesce(json_agg(json_build_object(
        'who', coalesce(g2.name, split_part(c.email,'@',1)), 'mine', c.email = g.email,
        'slot', c.slot, 'pub', p.name, 'at', c.created_at, 'located', c.located,
        'photo', c.photo_path) order by c.created_at desc), '[]'::json)
      from public.checkins c join public.guests g2 on g2.email = c.email join public.pubs p on p.id = c.pub_id where not g2.blocked));
end $f$;
revoke all on function public.crawl_state_v4(text, text) from public, authenticated;
grant execute on function public.crawl_state_v4(text, text) to anon;

-- 4. Tidy the release-day test guest.
delete from public.guests where email = 'claude-test@example.invalid';
