-- Run once in the Supabase SQL editor. No guest accounts or public data access.
create table if not exists public.bakers (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.bakers enable row level security;
revoke all on public.bakers from anon, authenticated;
create policy baker_self on public.bakers for select to authenticated using (user_id = (select auth.uid()));
grant select on public.bakers to authenticated;

create table if not exists public.kitchens (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references public.bakers(user_id),
 revision bigint not null default 1,
 data jsonb not null,
 updated_at timestamptz not null default now(),
 constraint kitchen_shape check (jsonb_typeof(data) = 'object' and jsonb_typeof(data->'recipes') = 'array' and jsonb_typeof(data->'ingredients') = 'array' and jsonb_typeof(data->'requests') = 'array' and octet_length(data::text) <= 5242880)
);
alter table public.kitchens enable row level security;
create policy kitchen_owner_read on public.kitchens for select to authenticated
 using (owner_id = (select auth.uid()) and exists (select 1 from public.bakers where user_id = (select auth.uid())));
revoke all on public.kitchens from anon, authenticated;
grant select on public.kitchens to authenticated;

create table if not exists public.kitchen_snapshots (
 id bigint generated always as identity primary key,
 kitchen_id uuid not null references public.kitchens(id) on delete cascade,
 owner_id uuid not null references public.bakers(user_id),
 revision bigint not null,
 data jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.kitchen_snapshots enable row level security;
create policy snapshot_owner_read on public.kitchen_snapshots for select to authenticated using(owner_id = (select auth.uid()));
revoke all on public.kitchen_snapshots from anon, authenticated;
grant select on public.kitchen_snapshots to authenticated;

-- Lock + revision comparison prevents a phone overwriting newer desktop edits.
create or replace function public.save_kitchen(expected_revision bigint, kitchen_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); current_row public.kitchens; result public.kitchens;
begin
 if expected_revision is null or expected_revision < 0 then raise exception 'Invalid revision' using errcode='22023'; end if;
 if who is null or not exists(select 1 from public.bakers where user_id=who) then
  raise exception 'Baker access required' using errcode='42501';
 end if;
 if jsonb_typeof(kitchen_data) is distinct from 'object' or jsonb_typeof(kitchen_data->'recipes') is distinct from 'array' or jsonb_typeof(kitchen_data->'ingredients') is distinct from 'array' or jsonb_typeof(kitchen_data->'requests') is distinct from 'array' or octet_length(kitchen_data::text)>5242880 then
  raise exception 'Invalid kitchen data' using errcode='22023';
 end if;
 -- Serializes initial creation as well as updates for this one baker.
 perform pg_advisory_xact_lock(hashtextextended(who::text,0));
 select * into current_row from public.kitchens where owner_id=who for update;
 if not found then
  if expected_revision <> 0 then raise exception 'Kitchen revision conflict' using errcode='40001'; end if;
  insert into public.kitchens(owner_id,data) values(who,kitchen_data) returning * into result;
 else
  if current_row.revision <> expected_revision then raise exception 'Kitchen revision conflict' using errcode='40001'; end if;
  insert into public.kitchen_snapshots(kitchen_id,owner_id,revision,data) values(current_row.id,who,current_row.revision,current_row.data);
  update public.kitchens set data=kitchen_data,revision=revision+1,updated_at=now() where id=current_row.id returning * into result;
  -- Keep the most recent 30 revisions in addition to manual downloadable backups.
  delete from public.kitchen_snapshots where kitchen_id=current_row.id and id not in (select id from public.kitchen_snapshots where kitchen_id=current_row.id order by id desc limit 30);
 end if;
 return jsonb_build_object('id',result.id,'revision',result.revision,'updated_at',result.updated_at);
end;
$$;
revoke all on function public.save_kitchen(bigint,jsonb) from public;
grant execute on function public.save_kitchen(bigint,jsonb) to authenticated;
