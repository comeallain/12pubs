create or replace function public._drop_at(p_slot integer) returns timestamp without time zone
language sql stable security definer set search_path to 'public' as $f$
  select (public._crawl_day() - (12 - p_slot)) + time '12:00'
$f$;
revoke all on function public._drop_at(integer) from public, anon, authenticated;

create or replace function public.crawl_state_v3(p_email text, p_pin text default null)
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
      'me', json_build_object('email', g.email, 'name', g.name),
      'crawl', base_crawl, 'people', base_people, 'drops', base_drops,
      'revealed', (select coalesce(json_agg(json_build_object('slot', r.slot, 'pub', to_jsonb(p) - 'role') order by r.slot), '[]'::json)
                   from public.route r join public.pubs p on p.id = r.pub_id where public._drop_at(r.slot) <= t));
  end if;
  return json_build_object('locked', false, 'preview', preview and not open_now,
    'me', json_build_object('email', g.email, 'name', g.name),
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
      from public.checkins c join public.guests g2 on g2.email = c.email join public.pubs p on p.id = c.pub_id where not g2.blocked and c.email = g.email));
end $f$;
revoke all on function public.crawl_state_v3(text, text) from public, authenticated;
grant execute on function public.crawl_state_v3(text, text) to anon;

create or replace function public.admin_state(p_pin text)
returns json language plpgsql security definer set search_path to 'public' as $f$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  return json_build_object(
    'guests', (select coalesce(json_agg(json_build_object('email', email, 'name', name, 'blocked', blocked,
        'checkins', (select count(*) from public.checkins c where c.email = g.email)) order by blocked, added_at), '[]'::json) from public.guests g),
    'archive', (select coalesce(json_agg(json_build_object('year', year, 'district', district, 'pubs', pubs) order by year), '[]'::json) from public.archive),
    'subs_all', (select json_agg(json_build_object('id', id, 'name', name, 'opens', opens)) from public.pubs where role = 'sub'),
    'pubs', (select json_agg(json_build_object('id', p.id, 'name', p.name, 'photo_url', p.photo_url, 'photo_credit', p.photo_credit)
             order by coalesce((select min(slot) from public.route r where r.original_pub_id = p.id), case p.role when 'sub' then 20 else 30 end), p.name)
             from public.pubs p),
    'checkins_total', (select count(*) from public.checkins));
end $f$;

create or replace function public.admin_pub_photo(p_pin text, p_pub_id text, p_path text)
returns json language plpgsql security definer set search_path to 'public' as $f$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  if p_path is not null and p_path !~ ('^pubs/' || p_pub_id || '-[0-9a-f-]{36}\.jpg$') then raise exception 'bad_path'; end if;
  update public.pubs set
    photo_url = case when p_path is null then null else 'https://afijpjkgkknhsmtriqzq.supabase.co/storage/v1/object/public/checkins/' || p_path end,
    photo_credit = null, photo_page = null
  where id = p_pub_id;
  if not found then raise exception 'no_pub'; end if;
  return json_build_object('ok', true);
end $f$;
revoke all on function public.admin_pub_photo(text, text, text) from public, authenticated;
grant execute on function public.admin_pub_photo(text, text, text) to anon;

create policy "pub photo upload" on storage.objects for insert to anon
  with check (bucket_id = 'checkins' and name ~ '^pubs/[a-z]+-[0-9a-f-]{36}\.jpg$');;
