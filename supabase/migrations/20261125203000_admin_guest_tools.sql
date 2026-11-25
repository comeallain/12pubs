-- Admin guest tools: rename someone, strike a guest off the list entirely,
-- or clear the whole list. Axing (blocking) already exists; these go further.

create or replace function public.admin_guest_rename(p_pin text, p_email text, p_name text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  update public.guests set name = nullif(left(trim(coalesce(p_name, '')), 40), '') where email = e;
  if not found then raise exception 'no_guest'; end if;
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_guest_rename(text, text, text) from public, authenticated;
grant execute on function public.admin_guest_rename(text, text, text) to anon;

create or replace function public.admin_guest_delete(p_pin text, p_email text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  delete from public.checkins where email = e;
  delete from public.guests where email = e;
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_guest_delete(text, text) from public, authenticated;
grant execute on function public.admin_guest_delete(text, text) to anon;

create or replace function public.admin_clear_guests(p_pin text) returns json
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public._admin(p_pin) then raise exception 'bad_pin' using errcode = '28000'; end if;
  delete from public.checkins;
  delete from public.guests;
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_clear_guests(text) from public, authenticated;
grant execute on function public.admin_clear_guests(text) to anon;
