create table if not exists public.users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  username text not null references public.users(username) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.invites add column if not exists owner_username text references public.users(username) on delete cascade;
create index if not exists invites_owner_username_idx on public.invites(owner_username);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
