-- Keep FUNY PIN profile defaults independent from social-provider metadata.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_provider text:=lower(coalesce(new.raw_app_meta_data->>'provider',''));
  v_compact_id text:=upper(replace(new.id::text,'-',''));
  v_nickname text;
begin
  if v_provider in ('google','apple','kakao') then
    v_nickname:='FUNY회원'||right(v_compact_id,4);
    if exists(
      select 1 from public.profiles p
      where lower(p.nickname)=lower(v_nickname)
    ) then
      v_nickname:='FUNY회원'||right(v_compact_id,6);
    end if;
  else
    v_nickname:=nullif(btrim(new.raw_user_meta_data->>'nickname'),'');
    if v_nickname is null then
      v_nickname:='FUNY회원'||right(v_compact_id,4);
      if exists(
        select 1 from public.profiles p
        where lower(p.nickname)=lower(v_nickname)
      ) then
        v_nickname:='FUNY회원'||right(v_compact_id,6);
      end if;
    end if;
  end if;

  insert into public.profiles(user_id,nickname,avatar_url)
  values(new.id,v_nickname,null)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
