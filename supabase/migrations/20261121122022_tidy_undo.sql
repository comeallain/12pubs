create or replace function public.undo_check_in(p_email text, p_slot int) returns json
language plpgsql volatile security definer set search_path = public as $$
declare g public.guests;
begin
  select * into g from public.guests where email = lower(trim(p_email));
  if g.email is null or g.blocked then raise exception 'not_on_list' using errcode = '28000'; end if;
  return json_build_object('ok', public._undo(g.email, p_slot));
end $$;;
