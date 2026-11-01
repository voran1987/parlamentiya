-- Dedicated private room storage for the "Revolutionary Situation" game.
-- Browser clients can only use the revolution-game Edge Function.
create table if not exists public.revolution_game_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4}$'),
  host_hash text not null check (host_hash ~ '^[a-f0-9]{64}$'),
  seat_auth jsonb not null default '{}'::jsonb check (jsonb_typeof(seat_auth) = 'object'),
  data jsonb not null default '{"meta":null,"state":null,"slots":{},"choices":{},"votes":{},"bg":null}'::jsonb
    check (jsonb_typeof(data) = 'object'),
  version bigint not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
alter table public.revolution_game_rooms enable row level security;
revoke all on public.revolution_game_rooms from anon, authenticated;
comment on table public.revolution_game_rooms is
  'Private classroom game data. Host/player tokens validated by revolution-game Edge Function; direct browser access denied.';
