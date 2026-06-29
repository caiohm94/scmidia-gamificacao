create table if not exists platform_themes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  subtitle     text not null default 'Plataforma de Gamificação Comercial',
  bg_gradient  text not null default 'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  primary_color  text not null default '#8DB23C',
  accent_color   text not null default '#FFDF00',
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Only one active theme at a time
create unique index if not exists idx_platform_themes_active
  on platform_themes (is_active) where is_active = true;

-- Seed the Hexa theme as active
insert into platform_themes (name, subtitle, bg_gradient, primary_color, accent_color, is_active)
values (
  'Missão Hexa',
  'Plataforma de Gamificação Comercial',
  'linear-gradient(145deg, #0a1a0e 0%, #0d2a14 50%, #071409 100%)',
  '#8DB23C',
  '#FFDF00',
  true
)
on conflict do nothing;
