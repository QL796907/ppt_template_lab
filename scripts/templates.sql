create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tags text[] not null default '{}',
  theme text,
  color_tone text,
  preview_key text,
  file_key text,
  source_note text,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;
