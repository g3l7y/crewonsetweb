create table if not exists public.cos_bug_reports (
  id text primary key,
  player_name text not null,
  player_id text not null,
  category text not null,
  description text not null,
  email text,
  attachment_name text,
  attachment_url text,
  attachment_type text,
  submitted_at timestamptz not null default now(),
  status text not null default 'New' check (status in ('New', 'Investigating', 'Resolved'))
);

create table if not exists public.cos_player_reports (
  id text primary key,
  reporter_name text not null,
  reporter_id text not null,
  reported_username text not null,
  report_type text not null,
  description text not null,
  attachment_name text,
  attachment_url text,
  attachment_type text,
  submitted_at timestamptz not null default now(),
  status text not null default 'New' check (status in ('New', 'Investigating', 'Resolved'))
);

create table if not exists public.cos_partnership_applications (
  id text primary key,
  brand text not null,
  product_type text not null,
  exact_model text not null,
  link text,
  file_name text,
  attachment_name text,
  attachment_url text,
  attachment_type text,
  budget numeric not null,
  duration numeric not null,
  duration_unit text not null,
  email text not null,
  description text,
  submitted_at timestamptz not null default now(),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'On-going', 'Done', 'Declined')),
  archived boolean not null default false,
  archived_at timestamptz
);

create table if not exists public.cos_admin_notifications (
  id text primary key,
  title text not null,
  body text not null,
  kind text not null,
  href text not null,
  entity_id text,
  entity_type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Apply this migration through the connected Supabase project before using the forms.
-- The client intentionally surfaces exact Supabase errors when tables or policies are unavailable.
-- If RLS is enabled in the project, add the project's authenticated/public policies before deploying.
