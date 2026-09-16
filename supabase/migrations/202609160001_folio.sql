-- Run once in the Supabase SQL Editor. Only the Worker service key can access
-- these tables/bucket; browser anon/authenticated roles have no direct access.
create table if not exists public.folio_workspaces (
 workspace_id text primary key default 'apub' check (workspace_id='apub'),
 updated_by uuid references auth.users(id) on delete set null,
 data jsonb not null default '[]',
 revision integer not null default 0,
 updated_at timestamptz not null default now(),
 check (jsonb_typeof(data) = 'array')
);
create table if not exists public.folio_publications (
 workspace_id text not null default 'apub' check (workspace_id='apub'),
 site_id text not null,
 publication_id uuid not null default gen_random_uuid() unique,
 primary key (workspace_id, site_id)
);
alter table public.folio_workspaces enable row level security;
alter table public.folio_publications enable row level security;
revoke all on public.folio_workspaces, public.folio_publications from anon, authenticated;
grant all on public.folio_workspaces, public.folio_publications to service_role;

create or replace function public.folio_save_workspace(p_actor uuid, p_revision integer, p_data jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare current_revision integer; links jsonb;
begin
 insert into public.folio_workspaces(workspace_id) values('apub') on conflict do nothing;
 select revision into current_revision from public.folio_workspaces where workspace_id='apub' for update;
 if current_revision <> p_revision then return jsonb_build_object('conflict',true); end if;
 update public.folio_workspaces set data=p_data, revision=revision+1, updated_at=now(), updated_by=p_actor where workspace_id='apub';
 insert into public.folio_publications(workspace_id,site_id)
 select 'apub', item->>'id' from jsonb_array_elements(p_data) item on conflict(workspace_id,site_id) do nothing;
 select coalesce(jsonb_object_agg(site_id,publication_id),'{}') into links from public.folio_publications where workspace_id='apub';
 return jsonb_build_object('sites',p_data,'revision',current_revision+1,'publications',links);
end $$;

create or replace function public.folio_claim_publication(p_site text, p_publication uuid)
returns jsonb language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from public.folio_workspaces, jsonb_array_elements(data) s where workspace_id='apub' and s->>'id'=p_site) then return jsonb_build_object('ok',false); end if;
 update public.folio_publications set publication_id=p_publication where workspace_id='apub' and site_id=p_site;
 return jsonb_build_object('ok',found);
exception when unique_violation then return jsonb_build_object('ok',false);
end $$;
revoke all on function public.folio_save_workspace(uuid,integer,jsonb), public.folio_claim_publication(text,uuid) from public, anon, authenticated;
grant execute on function public.folio_save_workspace(uuid,integer,jsonb), public.folio_claim_publication(text,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('folio-assets','folio-assets',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do nothing;

-- Enable this in Authentication > Hooks > Before User Created.
-- This is an early signup filter; the Worker rechecks the verified Google
-- identity on every private API request, including existing accounts.
create or replace function public.folio_before_user_created(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare email text := lower(event->'user'->>'email');
begin
 if email in ('ludia0602@gmail.com','ludy.kim@furiosa.ai') or email ~ '^[^@[:space:]]+@apub[.]kr$' then return '{}'::jsonb; end if;
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','이 계정은 Folio 사용 권한이 없어요.'));
end $$;
revoke all on function public.folio_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.folio_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
