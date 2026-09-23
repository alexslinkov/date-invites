create table if not exists public.invites (
  code text primary key,
  recipient text not null,
  question text not null,
  options jsonb not null,
  status text not null default 'sent',
  response jsonb,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
