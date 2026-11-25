create table if not exists public.pin_failures(at timestamptz not null default now());
alter table public.pin_failures enable row level security;
revoke all on public.pin_failures from anon, authenticated;

create or replace function public._dist(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns int
language sql immutable set search_path = pg_catalog as $$
  select round(2*6371000*asin(sqrt(power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))))::int
$$;

-- Wrong PINs are counted; after 20 wrong tries in an hour, even the right PIN is refused until the hour passes.
create or replace function public._admin(p_pin text) returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  if (select count(*) from public.pin_failures where at > now() - interval '1 hour') >= 20 then return false; end if;
  select exists(select 1 from public.settings where key='admin_pin' and value = extensions.crypt(coalesce(p_pin,''), value)) into ok;
  if not ok then insert into public.pin_failures default values; end if;
  delete from public.pin_failures where at < now() - interval '1 day';
  return ok;
end $$;
alter function public.admin_state(text) volatile;
revoke all on function public._guest(text), public._admin(text), public._dist(float8,float8,float8,float8) from public, anon, authenticated;

revoke execute on function public.join_crawl(text,text), public.crawl_state(text), public.check_in(text,int,text,float8,float8,float8),
  public.undo_check_in(text,int), public.admin_state(text), public.admin_guest(text,text,text,boolean),
  public.admin_swap(text,int,text), public.admin_clear_checkins(text) from authenticated;;
