-- SISTERLESS Website (im wherezup-Projekt, alles mit sl_ davor): Termine + Galerie
-- Einmal im Supabase SQL-Editor ausführen.

-- Wer darf ins Admin (E-Mail-Adressen, klein geschrieben)
create table if not exists sl_admins (email text primary key);
insert into sl_admins(email) values ('kobald_tobias@icloud.com') on conflict do nothing;

create or replace function sl_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sl_admins where email = lower(auth.jwt() ->> 'email'));
$$;

-- Termine
create table if not exists sl_gigs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time text,
  title text not null,
  city text,
  info text,
  ticket_url text,
  created_at timestamptz default now()
);

-- Galerie
create table if not exists sl_gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  storage_path text,
  caption text,
  sort int not null default 0,
  created_at timestamptz default now()
);

alter table sl_admins  enable row level security;
alter table sl_gigs    enable row level security;
alter table sl_gallery enable row level security;

drop policy if exists "sl_gigs lesen" on sl_gigs;
create policy "sl_gigs lesen" on sl_gigs for select using (date >= (now() at time zone 'Europe/Vienna')::date or sl_is_admin());
drop policy if exists "sl_gigs admin" on sl_gigs;
create policy "sl_gigs admin" on sl_gigs for all using (sl_is_admin()) with check (sl_is_admin());

drop policy if exists "galerie lesen" on sl_gallery;
create policy "galerie lesen" on sl_gallery for select using (true);
drop policy if exists "galerie admin" on sl_gallery;
create policy "galerie admin" on sl_gallery for all using (sl_is_admin()) with check (sl_is_admin());

drop policy if exists "sl_admins selbst" on sl_admins;
create policy "sl_admins selbst" on sl_admins for select using (sl_is_admin());

-- Speicher für Bilder (öffentlich lesbar, nur Admins schreiben)
insert into storage.buckets (id, name, public) values ('sisterless', 'sisterless', true)
  on conflict (id) do update set public = true;
drop policy if exists "galerie upload" on storage.objects;
create policy "galerie upload" on storage.objects for insert to authenticated with check (bucket_id = 'sisterless' and sl_is_admin());
drop policy if exists "galerie sehen" on storage.objects;
create policy "galerie sehen" on storage.objects for select to authenticated using (bucket_id = 'sisterless' and sl_is_admin());
drop policy if exists "galerie loeschen" on storage.objects;
create policy "galerie loeschen" on storage.objects for delete to authenticated using (bucket_id = 'sisterless' and sl_is_admin());

-- Vergangene Termine jede Nacht automatisch löschen
create extension if not exists pg_cron;
select cron.unschedule('sisterless-alte-gigs') where exists (select 1 from cron.job where jobname = 'sisterless-alte-gigs');
select cron.schedule('sisterless-alte-gigs', '5 0 * * *',
  $$delete from public.sl_gigs where date < (now() at time zone 'Europe/Vienna')::date$$);

-- Startdaten (bestehende Bilder + aktueller Termin)
insert into sl_gallery (url, sort)
select v.url, v.sort from (values
  ('DSC_0273-55.JPG', 1), ('DSC_0070-19.JPG', 2), ('DSC_0195-38.JPG', 3),
  ('DSC_0233-46.JPG', 4), ('DSC_0248-50.JPG', 5)) as v(url, sort)
where not exists (select 1 from sl_gallery);

insert into sl_gigs (date, title, info)
select '2026-11-26', 'Club Wakuum', 'Live'
where not exists (select 1 from sl_gigs);
