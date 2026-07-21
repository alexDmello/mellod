-- ============================================================
-- Supabase Storage Bucket Setup for Mellod Pickup Photos
-- ============================================================

-- 1. Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-photos', 'pickup-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read pickup photos
CREATE POLICY "Public Read Access for pickup-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'pickup-photos');

-- 3. Allow authenticated users to upload pickup photos
CREATE POLICY "Authenticated Upload for pickup-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pickup-photos');

-- 4. Allow authenticated users to update/delete pickup photos
CREATE POLICY "Authenticated Manage for pickup-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pickup-photos');

CREATE POLICY "Authenticated Delete for pickup-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pickup-photos');
