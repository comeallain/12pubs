alter table public.guests add column if not exists blocked boolean not null default false;
alter table public.pubs add column if not exists photo_url text;
alter table public.pubs add column if not exists photo_credit text;
alter table public.pubs add column if not exists photo_page text;

update public.pubs set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/The_Shakespeare_-_Korean_Pub_On_Parnell_Street_-_panoramio_%281%29.jpg/960px-The_Shakespeare_-_Korean_Pub_On_Parnell_Street_-_panoramio_%281%29.jpg',
  photo_credit = 'Photo: William Murphy, CC BY-SA 3.0 (2012)', photo_page = 'https://commons.wikimedia.org/wiki/File:The_Shakespeare_-_Korean_Pub_On_Parnell_Street_-_panoramio_(1).jpg' where id = 'shakespeare';
update public.pubs set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/1/10/Whelan%27s_Bar_-_geograph.org.uk_-_4795032.jpg',
  photo_credit = 'Photo: Ian S, CC BY-SA 2.0 (2016)', photo_page = 'https://commons.wikimedia.org/wiki/File:Whelan%27s_Bar_-_geograph.org.uk_-_4795032.jpg' where id = 'whelans';
update public.pubs set photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/BLEECKER_STREET_RESTAURANT_%28INTERESTING_BUILDING_AT_68_DORSET_STREET%29-158679_-_Flickr_-_infomatique.jpg/960px-BLEECKER_STREET_RESTAURANT_%28INTERESTING_BUILDING_AT_68_DORSET_STREET%29-158679_-_Flickr_-_infomatique.jpg',
  photo_credit = 'Photo: William Murphy, CC BY-SA 2.0 (2019)', photo_page = 'https://commons.wikimedia.org/wiki/File:BLEECKER_STREET_RESTAURANT_(INTERESTING_BUILDING_AT_68_DORSET_STREET)-158679_-_Flickr_-_infomatique.jpg' where id = 'bleecker';

create or replace function public._dublin_now() returns timestamp
language sql stable set search_path = pg_catalog as $$ select (now() at time zone 'Europe/Dublin') $$;
create or replace function public._crawl_day() returns date
language sql stable security definer set search_path = public as $$ select value::date from public.settings where key = 'date' $$;
create or replace function public._slot_opens(p_slot int) returns timestamp
language sql stable security definer set search_path = public as $$
  select public._crawl_day() + (select value::time from public.settings where key = 'start')
    + make_interval(mins => 30 * least(p_slot - 1, 6) + 45 * greatest(p_slot - 7, 0) - 15)
$$;
revoke all on function public._dublin_now(), public._crawl_day(), public._slot_opens(int) from public, anon, authenticated;

create or replace function public.join_crawl(p_email text, p_name text default null) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email,''))); g public.guests;
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 120 then return json_build_object('ok', false, 'reason', 'bad_email'); end if;
  select * into g from public.guests where email = e;
  if g.email is not null and g.blocked then return json_build_object('ok', false, 'reason', 'axed'); end if;
  insert into public.guests(email, name) values (e, nullif(left(trim(coalesce(p_name,'')), 40), ''))
  on conflict (email) do update set name = coalesce(nullif(left(trim(coalesce(p_name,'')), 40), ''), public.guests.name)
  returning * into g;
  return json_build_object('ok', true, 'name', g.name, 'email', g.email);
end $$;

create or replace function public.crawl_state_v2(p_email text, p_pin text default null) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests; preview boolean := false; open_now boolean;
begin
  select * into g from public.guests where email = lower(trim(p_email));
  if g.email is null or g.blocked then raise exception 'not_on_list' using errcode = '28000'; end if;
  if p_pin is not null then preview := public._admin(p_pin); end if;
  open_now := public._dublin_now()::date >= public._crawl_day();
  if not (open_now or preview) then
    return json_build_object('locked', true,
      'me', json_build_object('email', g.email, 'name', g.name),
      'crawl', (select json_object_agg(key, value) from public.settings where key in ('date','start','title','last_orders')),
      'people', (select coalesce(json_agg(json_build_object('who', coalesce(name, split_part(email,'@',1)), 'me', email = g.email) order by added_at), '[]'::json)
                 from public.guests where not blocked));
  end if;
  return json_build_object('locked', false, 'preview', preview and not open_now,
    'me', json_build_object('email', g.email, 'name', g.name),
    'crawl', (select json_object_agg(key, value) from public.settings where key in ('date','start','title','last_orders')),
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
        'distance', c.distance_m, 'photo', c.photo_path) order by c.created_at desc), '[]'::json)
      from public.checkins c join public.guests g2 on g2.email = c.email join public.pubs p on p.id = c.pub_id where not g2.blocked),
    'people', (select coalesce(json_agg(json_build_object('who', coalesce(name, split_part(email,'@',1)), 'me', email = g.email) order by added_at), '[]'::json)
      from public.guests where not blocked));
end $$;

create or replace function public.check_in_v2(p_email text, p_slot int, p_photo text, p_lat float8, p_lng float8, p_acc float8, p_pin text default null) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests; p public.pubs; d int; ok boolean; practice boolean := false;
begin
  select * into g from public.guests where email = lower(trim(p_email));
  if g.email is null or g.blocked then raise exception 'not_on_list' using errcode = '28000'; end if;
  if p_pin is not null then practice := public._admin(p_pin); end if;
  if not practice and public._dublin_now() < public._slot_opens(p_slot) then
    raise exception 'too_early:%', to_char(public._slot_opens(p_slot), 'HH24:MI DD/MM');
  end if;
  select pb.* into p from public.route r join public.pubs pb on pb.id = r.pub_id where r.slot = p_slot;
  if p.id is null then raise exception 'no_such_stop'; end if;
  if p_photo is not null and p_photo !~ '^2026/[0-9a-f-]{36}\.(jpg|webp)$' then raise exception 'bad_photo'; end if;
  if p_lat is not null and p_lng is not null then
    d := public._dist(p_lat, p_lng, p.lat, p.lng);
    ok := d <= 120 + least(coalesce(p_acc, 0), 80);
  else d := null; ok := false; end if;
  insert into public.checkins(email, slot, pub_id, photo_path, lat, lng, accuracy, distance_m, located)
  values (g.email, p_slot, p.id, p_photo, p_lat, p_lng, p_acc, d, ok)
  on conflict (email, slot) do update set pub_id = excluded.pub_id,
    photo_path = coalesce(excluded.photo_path, public.checkins.photo_path),
    lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy,
    distance_m = excluded.distance_m, located = excluded.located, created_at = now();
  return json_build_object('ok', true, 'located', ok, 'distance', d, 'practice', practice);
end $$;

create or replace function public.undo_check_in(p_email text, p_slot int) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests;
begin
  select * into g from public.guests where email = lower(trim(p_email));
  if g.email is null or g.blocked then raise exception 'not_on_list' using errcode = '28000'; end if;
  update public.checkins set slot = slot where false;
  perform 1;
  return json_build_object('ok', public._undo(g.email, p_slot));
end $$;

create or replace function public._undo(p_email text, p_slot int) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  delete from public.checkins where email = p_email and slot = p_slot;
  return true;
end $$;
revoke all on function public._undo(text,int) from public, anon, authenticated;

create or replace function public.admin_guest(p_pin text, p_email text, p_name text, p_remove boolean default false) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  if p_remove then
    insert into public.guests(email, blocked) values (e, true) on conflict (email) do update set blocked = true;
    perform public._undo(e, s) from generate_series(1,12) s;
  else
    insert into public.guests(email, name) values (e, nullif(left(trim(coalesce(p_name,'')),40),''))
    on conflict (email) do update set blocked = false, name = coalesce(excluded.name, public.guests.name);
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_state(p_pin text) returns json
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  return json_build_object(
    'guests', (select coalesce(json_agg(json_build_object('email', email, 'name', name, 'blocked', blocked,
        'checkins', (select count(*) from public.checkins c where c.email = g.email)) order by blocked, added_at), '[]'::json) from public.guests g),
    'archive', (select coalesce(json_agg(json_build_object('year', year, 'district', district, 'pubs', pubs) order by year), '[]'::json) from public.archive),
    'subs_all', (select json_agg(json_build_object('id', id, 'name', name, 'opens', opens)) from public.pubs where role = 'sub'));
end $$;

-- The old route functions stay but nobody outside can call them; they ignore the day lock.
revoke execute on function public.crawl_state(text), public.check_in(text,int,text,float8,float8,float8) from public, anon, authenticated;
revoke all on function public.crawl_state_v2(text,text), public.check_in_v2(text,int,text,float8,float8,float8,text) from public, authenticated;
grant execute on function public.crawl_state_v2(text,text), public.check_in_v2(text,int,text,float8,float8,float8,text) to anon;
revoke execute on function public.join_crawl(text,text), public.undo_check_in(text,int), public.admin_guest(text,text,text,boolean), public.admin_state(text) from public, authenticated;
grant execute on function public.join_crawl(text,text), public.undo_check_in(text,int), public.admin_guest(text,text,text,boolean), public.admin_state(text) to anon;;
