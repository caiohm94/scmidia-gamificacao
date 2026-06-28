-- Foto por participante por campanha
alter table campaign_participants add column if not exists photo_url text;

-- Bucket para fotos (executar via Supabase Dashboard Storage se não existir)
-- insert into storage.buckets (id, name, public) values ('participant-photos', 'participant-photos', true)
-- on conflict do nothing;
