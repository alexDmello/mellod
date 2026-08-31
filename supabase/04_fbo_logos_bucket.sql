-- ============================================================
-- MELLOD — FBO LOGOS STORAGE BUCKET
-- Run this in your MAIN DB (the original Supabase project).
-- Creates the fbo-logos bucket for restaurant logo uploads.
-- ============================================================

-- Create the bucket (public so logo URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fbo-logos',
  'fbo-logos',
  true,               -- public: logo URLs are served directly
  5242880,            -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Service role can upload logos (INSERT: only WITH CHECK allowed)
CREATE POLICY "service_role_logo_upload" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'fbo-logos');

-- Service role can replace/update logos
CREATE POLICY "service_role_logo_update" ON storage.objects
  FOR UPDATE TO service_role
  USING (bucket_id = 'fbo-logos')
  WITH CHECK (bucket_id = 'fbo-logos');

-- Public can read logo files
CREATE POLICY "public_logo_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'fbo-logos');
