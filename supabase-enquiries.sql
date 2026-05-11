-- H²AI Client Enquiries Table
-- Run in Supabase → SQL Editor → New Query → Run

create table if not exists public.enquiries (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now() not null,
  full_name       text        not null,
  email           text        not null,
  phone           text,
  company         text,
  role            text,
  enquiry_type    text        not null,  -- 'advisory', 'learn', 'labs', 'general'
  organisation_size text,
  message         text,
  source          text        default 'website'
);

alter table public.enquiries enable row level security;

create policy "allow_anon_insert_enquiries"
  on public.enquiries
  for insert to anon
  with check (true);

create policy "allow_auth_select_enquiries"
  on public.enquiries
  for select to authenticated
  using (true);

create index if not exists idx_enquiries_email
  on public.enquiries (email);

create index if not exists idx_enquiries_type
  on public.enquiries (enquiry_type);
