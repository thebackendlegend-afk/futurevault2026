
-- Allow public read access to files belonging to public, unlocked capsules
CREATE POLICY "capsule_files_public_unlocked_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'capsule-files'
  AND EXISTS (
    SELECT 1 FROM public.capsules c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND c.is_public = true
      AND c.unlock_time <= now()
  )
);
