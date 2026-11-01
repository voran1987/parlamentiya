-- Current Supabase backend for the China diplomacy game.
-- Used by the protected Edge Function at china-game. Never expose this table directly.
create table if not exists public.china_game_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4}$'),
  host_hash text not null check (length(host_hash) = 64),
  seat_auth jsonb not null default '{}'::jsonb,
  data jsonb not null default '{"meta":null,"state":null,"seats":{},"choices":{},"votes":{}}'::jsonb,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint china_room_seat_auth_object check (jsonb_typeof(seat_auth) = 'object'),
  constraint china_room_data_object check (jsonb_typeof(data) = 'object')
);
alter table public.china_game_rooms enable row level security;
revoke all on table public.china_game_rooms from public, anon, authenticated;
grant select, insert, update, delete on table public.china_game_rooms to service_role;
comment on table public.china_game_rooms is 'China diplomacy classroom game rooms. API access exclusively through china-game Edge Function with host/player tokens; no direct browser table access.';