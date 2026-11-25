alter table public.pubs add column if not exists sv jsonb;
update public.pubs set sv = jsonb_build_object('pano','kXWS9-1XRmz8gIRGGlfNdw','lat',53.3625859,'lng',-6.2423476,'h',12,'p',0) where id='meaghers';
update public.pubs set sv = jsonb_build_object('pano','Hbn480Ia2sJbxZRcq0z4NQ','lat',53.3613101,'lng',-6.2429448,'h',108,'p',2) where id='clonliffe';
update public.pubs set sv = jsonb_build_object('pano','hsos2F1L19Cul6e79GLGOw','lat',53.3573999,'lng',-6.2490196,'h',152,'p',2) where id='bridge';
update public.pubs set sv = jsonb_build_object('pano','EiKlZBMdO2ETrirOwN6XpQ','lat',53.3534995,'lng',-6.2593411,'h',116,'p',3) where id='bigromance';
update public.pubs set sv = jsonb_build_object('pano','T3FkTXv0ODKlutgtPVyRHw','lat',53.353202,'lng',-6.2600123,'h',330,'p',0) where id='oreillys';
update public.pubs set sv = jsonb_build_object('pano','reGL-qg7Ce3GzfwCvpvtrQ','lat',53.3529321,'lng',-6.2606279,'h',319,'p',2) where id='shakespeare';
update public.pubs set sv = jsonb_build_object('pano','I3fqW0f5xviNS22Ze4UKRA','lat',53.3528208,'lng',-6.2608483,'h',128,'p',2) where id='fibbers';
update public.pubs set sv = jsonb_build_object('pano','QWjBroRAAa6xGO3lUCOu8A','lat',53.3525202,'lng',-6.2614992,'h',100,'p',0) where id='murrays';
update public.pubs set sv = jsonb_build_object('pano','6x8dl2BBJ4JKK42n9lsvAA','lat',53.3523105,'lng',-6.2621076,'h',126,'p',4) where id='parnell';
update public.pubs set sv = jsonb_build_object('pano','z1RrBFEC4WomnctPgEKs0Q','lat',53.3552408,'lng',-6.2658867,'h',293,'p',0) where id='joxers';
update public.pubs set sv = jsonb_build_object('pano','B01bV6bsawP5oodupWx4Gw','lat',53.3555094,'lng',-6.2656051,'h',270,'p',1) where id='glynns';
update public.pubs set sv = jsonb_build_object('pano','B01bV6bsawP5oodupWx4Gw','lat',53.3555094,'lng',-6.2656051,'h',318,'p',1) where id='delahuntys';
update public.pubs set sv = jsonb_build_object('pano','2oj6WzLfw8SKLGLkeW6fag','lat',53.3575882,'lng',-6.2639689,'h',178,'p',0) where id='bleecker';
update public.pubs set sv = jsonb_build_object('pano','1YtlXhQNTwB-Un4iZDce-Q','lat',53.3530415,'lng',-6.2603859,'h',357,'p',2) where id='memas';
update public.pubs set sv = jsonb_build_object('pano','5swDTfXgDssr2lKCWh7-gw','lat',53.3501356,'lng',-6.2671289,'h',304,'p',0) where id='woolshed';
update public.pubs set sv = jsonb_build_object('pano','KqgPLJofjz2-8uHWIljmuQ','lat',53.3366442,'lng',-6.265489,'h',243,'p',0) where id='whelans';
update public.pubs set photo_url='https://commons.wikimedia.org/wiki/Special:FilePath/O%27Reilly%27s_Dear_Head_Bar_and_Paddy_Power%27s_Betting_Shop_in_Parnell_Street_-_geograph.org.uk_-_2261666.jpg?width=960', photo_credit='Photo: Eric Jones, CC BY-SA 2.0 (2011)', photo_page='https://commons.wikimedia.org/wiki/File:O%27Reilly%27s_Dear_Head_Bar_and_Paddy_Power%27s_Betting_Shop_in_Parnell_Street_-_geograph.org.uk_-_2261666.jpg' where id='oreillys';
update public.pubs set photo_url='https://commons.wikimedia.org/wiki/Special:FilePath/Jehnova_performs_at_The_Big_Romance,_Dublin.jpg?width=960', photo_credit='Photo: FourthBest, CC BY 4.0 (2025)', photo_page='https://commons.wikimedia.org/wiki/File:Jehnova_performs_at_The_Big_Romance,_Dublin.jpg' where id='bigromance';
insert into public.settings(key,value) values ('preview_code', extensions.crypt('barrel-tankard-58', extensions.gen_salt('bf'))) on conflict (key) do update set value=excluded.value;
create or replace function public._preview_ok(p_code text) returns boolean language plpgsql security definer set search_path to 'public','extensions' as $f$
declare ok boolean;
begin
  if (select count(*) from public.pin_failures where at > now() - interval '1 hour') >= 20 then return false; end if;
  select exists(select 1 from public.settings where key='preview_code' and value = extensions.crypt(coalesce(p_code,''), value)) into ok;
  if not ok then insert into public.pin_failures default values; end if;
  return ok;
end $f$;
create or replace function public.preview_data(p_code text) returns jsonb language plpgsql security definer set search_path to 'public' as $f$
begin
  if not public._preview_ok(p_code) then return jsonb_build_object('error','bad_code'); end if;
  return jsonb_build_object(
    'pubs', (select jsonb_object_agg(id, jsonb_build_object('id',id,'name',name,'aka',aka,'area',area,'lat',lat,'lng',lng,'opens',opens,'closes',closes,'food',food,'maps_id',maps_id,'history',history,'photo_url',photo_url,'photo_credit',photo_credit,'photo_page',photo_page,'sv',sv)) from public.pubs),
    'route', (select jsonb_agg(coalesce(original_pub_id, pub_id) order by slot) from public.route),
    'subs', (select jsonb_agg(id order by id) from public.pubs where role='sub'),
    'after', (select id from public.pubs where role='after' limit 1),
    'archive', '[]'::jsonb);
end $f$;
revoke all on function public._preview_ok(text) from public, anon, authenticated;
revoke all on function public.preview_data(text) from public, authenticated;
grant execute on function public.preview_data(text) to anon;;
