create extension if not exists pgcrypto with schema extensions;

create table public.guests(
  email text primary key check (email = lower(trim(email)) and email like '%_@_%._%'),
  name text,
  added_at timestamptz not null default now()
);
create table public.settings(key text primary key, value text not null);
create table public.pubs(
  id text primary key,
  name text not null,
  aka text,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  opens text not null,
  closes text not null,
  role text not null check (role in ('route','sub','after')),
  food boolean not null default false,
  paint text not null default '#1F4D3A',
  history text,
  maps_id text
);
create table public.route(
  slot int primary key check (slot between 1 and 12),
  pub_id text not null references public.pubs(id),
  original_pub_id text not null references public.pubs(id)
);
create table public.checkins(
  id uuid primary key default gen_random_uuid(),
  email text not null references public.guests(email) on delete cascade,
  slot int not null references public.route(slot),
  pub_id text not null references public.pubs(id),
  photo_path text,
  lat double precision, lng double precision, accuracy double precision,
  distance_m int,
  located boolean not null default false,
  created_at timestamptz not null default now(),
  unique (email, slot)
);
create table public.archive(
  year int primary key,
  district text not null,
  pubs jsonb not null
);

alter table public.guests enable row level security;
alter table public.settings enable row level security;
alter table public.pubs enable row level security;
alter table public.route enable row level security;
alter table public.checkins enable row level security;
alter table public.archive enable row level security;
-- No policies: the browser can only reach data through the functions below.
revoke all on public.guests, public.settings, public.pubs, public.route, public.checkins, public.archive from anon, authenticated;

create or replace function public._guest(p_email text) returns public.guests
language sql stable security definer set search_path = public as $$
  select * from public.guests where email = lower(trim(p_email))
$$;
create or replace function public._admin(p_pin text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists(select 1 from public.settings where key='admin_pin' and value = extensions.crypt(coalesce(p_pin,''), value))
$$;
create or replace function public._dist(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns int
language sql immutable as $$
  select round(2*6371000*asin(sqrt(power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))))::int
$$;
revoke all on function public._guest(text), public._admin(text), public._dist(float8,float8,float8,float8) from public, anon, authenticated;

create or replace function public.join_crawl(p_email text, p_name text default null) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests;
begin
  g := public._guest(p_email);
  if g.email is null then return json_build_object('ok', false); end if;
  if coalesce(trim(p_name),'') <> '' then
    update public.guests set name = left(trim(p_name), 40) where email = g.email returning * into g;
  end if;
  return json_build_object('ok', true, 'name', g.name, 'email', g.email);
end $$;

create or replace function public.crawl_state(p_email text) returns json
language plpgsql stable security definer set search_path = public as $$
declare g public.guests;
begin
  g := public._guest(p_email);
  if g.email is null then raise exception 'not_on_list' using errcode = '28000'; end if;
  return json_build_object(
    'me', json_build_object('email', g.email, 'name', g.name),
    'crawl', (select json_object_agg(key, value) from public.settings where key in ('date','start','title','last_orders')),
    'route', (select json_agg(json_build_object(
        'slot', r.slot, 'swapped_from', case when r.pub_id <> r.original_pub_id then o.name end,
        'pub', to_jsonb(p) - 'role') order by r.slot)
      from public.route r join public.pubs p on p.id = r.pub_id join public.pubs o on o.id = r.original_pub_id),
    'subs', (select json_agg(to_jsonb(p) - 'role' order by p.name) from public.pubs p where p.role = 'sub'
             and p.id not in (select pub_id from public.route)),
    'after', (select to_jsonb(p) - 'role' from public.pubs p where p.role = 'after' limit 1),
    'checkins', (select coalesce(json_agg(json_build_object(
        'who', coalesce(g2.name, split_part(c.email,'@',1)), 'mine', c.email = g.email,
        'slot', c.slot, 'pub', p.name, 'at', c.created_at, 'located', c.located,
        'distance', c.distance_m, 'photo', c.photo_path) order by c.created_at desc), '[]'::json)
      from public.checkins c join public.guests g2 on g2.email = c.email join public.pubs p on p.id = c.pub_id),
    'people', (select coalesce(json_agg(json_build_object('who', coalesce(name, split_part(email,'@',1)), 'me', email = g.email) order by name), '[]'::json)
      from public.guests)
  );
end $$;

create or replace function public.check_in(p_email text, p_slot int, p_photo text, p_lat float8, p_lng float8, p_acc float8) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests; p public.pubs; d int; ok boolean;
begin
  g := public._guest(p_email);
  if g.email is null then raise exception 'not_on_list' using errcode = '28000'; end if;
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
  return json_build_object('ok', true, 'located', ok, 'distance', d);
end $$;

create or replace function public.undo_check_in(p_email text, p_slot int) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests;
begin
  g := public._guest(p_email);
  if g.email is null then raise exception 'not_on_list' using errcode = '28000'; end if;
  delete from public.checkins where email = g.email and slot = p_slot;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_state(p_pin text) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  return json_build_object(
    'guests', (select coalesce(json_agg(json_build_object('email', email, 'name', name,
        'checkins', (select count(*) from public.checkins c where c.email = g.email)) order by added_at), '[]'::json) from public.guests g),
    'archive', (select coalesce(json_agg(json_build_object('year', year, 'district', district, 'pubs', pubs) order by year), '[]'::json) from public.archive),
    'subs_all', (select json_agg(json_build_object('id', id, 'name', name, 'opens', opens)) from public.pubs where role = 'sub'));
end $$;

create or replace function public.admin_guest(p_pin text, p_email text, p_name text, p_remove boolean default false) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  if p_remove then delete from public.guests where email = e;
  else insert into public.guests(email, name) values (e, nullif(left(trim(coalesce(p_name,'')),40),''))
       on conflict (email) do update set name = coalesce(excluded.name, public.guests.name);
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_swap(p_pin text, p_slot int, p_pub_id text) returns json
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  if p_pub_id is null then
    update public.route set pub_id = original_pub_id where slot = p_slot;
  else
    if not exists(select 1 from public.pubs where id = p_pub_id and role = 'sub') then raise exception 'not_a_sub'; end if;
    if exists(select 1 from public.route where pub_id = p_pub_id) then raise exception 'sub_in_use'; end if;
    update public.route set pub_id = p_pub_id where slot = p_slot;
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.admin_clear_checkins(p_pin text) returns json
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  delete from public.checkins where true;
  return json_build_object('ok', true);
end $$;

revoke all on function public.join_crawl(text,text), public.crawl_state(text), public.check_in(text,int,text,float8,float8,float8),
  public.undo_check_in(text,int), public.admin_state(text), public.admin_guest(text,text,text,boolean),
  public.admin_swap(text,int,text), public.admin_clear_checkins(text) from public;
grant execute on function public.join_crawl(text,text), public.crawl_state(text), public.check_in(text,int,text,float8,float8,float8),
  public.undo_check_in(text,int), public.admin_state(text), public.admin_guest(text,text,text,boolean),
  public.admin_swap(text,int,text), public.admin_clear_checkins(text) to anon;

-- Photos: anyone with the app can upload a new photo, nobody can list, replace or delete through the API.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('checkins', 'checkins', true, 3145728, array['image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy "checkin photo upload" on storage.objects for insert to anon
  with check (bucket_id = 'checkins' and name ~ '^2026/[0-9a-f-]{36}\.(jpg|webp)$');;
