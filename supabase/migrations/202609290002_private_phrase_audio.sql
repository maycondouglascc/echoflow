insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('phrase-audio', 'phrase-audio', false, 5242880, array['audio/wav', 'audio/mpeg']);
create policy published_reference_download on storage.objects for select to authenticated using (
  bucket_id = 'phrase-audio' and exists (
    select 1 from public.audio_variants a where a.storage_path = name and a.active
  )
);
-- No client upload/update/delete policies: only the explicit maintenance import writes audio.
