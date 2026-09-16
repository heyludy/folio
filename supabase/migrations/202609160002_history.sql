-- Project history and activity are private to the authenticated Worker.
create table if not exists public.folio_history (
 id uuid primary key default gen_random_uuid(),
 workspace_id text not null default 'apub' check(workspace_id='apub'),
 site_id text not null,
 snapshot jsonb not null,
 reason text not null check(reason in ('edit','import','publish','restore','manual')),
 actor_id uuid references auth.users(id) on delete set null,
 actor_email text,
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists folio_history_site_time on public.folio_history(site_id,created_at desc,id);
create table if not exists public.folio_activity (
 workspace_id text not null default 'apub' check(workspace_id='apub'),
 site_id text primary key,
 updated_by uuid references auth.users(id) on delete set null,
 updated_email text,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.folio_history enable row level security;
alter table public.folio_activity enable row level security;
revoke all on public.folio_history,public.folio_activity from public,anon,authenticated;
grant all on public.folio_history,public.folio_activity to service_role;

create or replace function public.folio_record_history(p_actor uuid,p_email text,p_site text,p_snapshot jsonb,p_reason text)
returns uuid language plpgsql set search_path='' as $$
declare previous public.folio_history; result uuid;
begin
 select * into previous from public.folio_history where site_id=p_site order by created_at desc,id desc limit 1;
 -- Keep the start of a continuous editing session, not every keystroke.
 if p_reason='edit' and previous.id is not null and
   (previous.snapshot=p_snapshot or (previous.reason='edit' and previous.actor_id=p_actor and previous.created_at>clock_timestamp()-interval '5 minutes')) then return previous.id; end if;
 insert into public.folio_history(site_id,snapshot,reason,actor_id,actor_email)
 values(p_site,p_snapshot,p_reason,p_actor,p_email) returning id into result;
 delete from public.folio_history where site_id=p_site and id in
   (select id from public.folio_history where site_id=p_site order by created_at desc,id desc offset 30);
 return result;
end $$;

create or replace function public.folio_save_workspace_v2(p_actor uuid,p_email text,p_revision integer,p_data jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare current_revision integer; old_data jsonb; item jsonb; old_item jsonb; links jsonb;
begin
 insert into public.folio_workspaces(workspace_id) values('apub') on conflict do nothing;
 select revision,data into current_revision,old_data from public.folio_workspaces where workspace_id='apub' for update;
 if current_revision<>p_revision then return jsonb_build_object('conflict',true); end if;
 for item in select value from jsonb_array_elements(p_data) loop
  select value into old_item from jsonb_array_elements(old_data) where value->>'id'=item->>'id';
  if old_item is distinct from item then
   if old_item is not null then perform public.folio_record_history(p_actor,p_email,item->>'id',old_item,'edit'); end if;
   insert into public.folio_activity(site_id,updated_by,updated_email) values(item->>'id',p_actor,p_email)
   on conflict(site_id) do update set updated_by=p_actor,updated_email=p_email,updated_at=clock_timestamp();
  end if;
 end loop;
 update public.folio_workspaces set data=p_data,revision=revision+1,updated_at=now(),updated_by=p_actor where workspace_id='apub';
 insert into public.folio_publications(workspace_id,site_id)
 select 'apub',value->>'id' from jsonb_array_elements(p_data) on conflict(workspace_id,site_id) do nothing;
 select coalesce(jsonb_object_agg(site_id,publication_id),'{}') into links from public.folio_publications where workspace_id='apub';
 return jsonb_build_object('sites',p_data,'revision',current_revision+1,'publications',links,'activity',
  (select coalesce(jsonb_object_agg(site_id,jsonb_build_object('email',updated_email,'at',updated_at)),'{}') from public.folio_activity));
end $$;
-- Existing callers remain compatible during the rollout.
create or replace function public.folio_save_workspace(p_actor uuid,p_revision integer,p_data jsonb)
returns jsonb language sql set search_path='' as $$
 select public.folio_save_workspace_v2(p_actor,null,p_revision,p_data);
$$;

create or replace function public.folio_checkpoint(p_actor uuid,p_email text,p_site text,p_reason text,p_expected jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare current_site jsonb; saved_id uuid;
begin
 perform 1 from public.folio_workspaces where workspace_id='apub' for update;
 select value into current_site from public.folio_workspaces,jsonb_array_elements(data) where workspace_id='apub' and value->>'id'=p_site;
 if current_site is null or current_site ? 'deletedAt' then return jsonb_build_object('missing',true); end if;
 if current_site<>p_expected then return jsonb_build_object('conflict',true); end if;
 saved_id:=public.folio_record_history(p_actor,p_email,p_site,current_site,p_reason);
 return jsonb_build_object('id',saved_id);
end $$;

create or replace function public.folio_restore_history(p_actor uuid,p_email text,p_site text,p_history uuid,p_expected jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare current_data jsonb; current_revision integer; current_site jsonb; snapshot_data jsonb; restored jsonb; next_data jsonb;
begin
 select data,revision into current_data,current_revision from public.folio_workspaces where workspace_id='apub' for update;
 select value into current_site from jsonb_array_elements(current_data) where value->>'id'=p_site;
 select snapshot into snapshot_data from public.folio_history where id=p_history and site_id=p_site;
 if current_site is null or current_site ? 'deletedAt' or snapshot_data is null then return jsonb_build_object('missing',true); end if;
 if current_site<>p_expected then return jsonb_build_object('conflict',true); end if;
 perform public.folio_record_history(p_actor,p_email,p_site,current_site,'restore');
 -- Restore content, retaining today's project identity and website connection.
 restored:=(snapshot_data-'deletedAt'-'linkedWebsite')||jsonb_build_object('id',p_site);
 if current_site ? 'linkedWebsite' then restored:=restored||jsonb_build_object('linkedWebsite',current_site->'linkedWebsite'); end if;
 select jsonb_agg(case when value->>'id'=p_site then restored else value end order by ord)
 into next_data from jsonb_array_elements(current_data) with ordinality as items(value,ord);
 return public.folio_save_workspace_v2(p_actor,p_email,current_revision,next_data);
end $$;

revoke all on function public.folio_record_history(uuid,text,text,jsonb,text),public.folio_save_workspace_v2(uuid,text,integer,jsonb),public.folio_checkpoint(uuid,text,text,text,jsonb),public.folio_restore_history(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.folio_record_history(uuid,text,text,jsonb,text),public.folio_save_workspace_v2(uuid,text,integer,jsonb),public.folio_checkpoint(uuid,text,text,text,jsonb),public.folio_restore_history(uuid,text,text,uuid,jsonb) to service_role;
