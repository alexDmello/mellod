-- Migration: 06_fix_picker_fbo_access.sql
-- Description: Allow pickers to read FBO details for FBOs assigned via routes OR pickup_requests

DROP POLICY IF EXISTS "Pickers read assigned fbos" ON public.fbos;

CREATE POLICY "Pickers read assigned fbos" ON public.fbos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routes r
    WHERE r.fbo_id = fbos.id
      AND r.picker_id = (SELECT id FROM public.pickers WHERE profile_id = auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.pickup_requests pr
    WHERE pr.fbo_id = fbos.id
      AND pr.assigned_picker_id = (SELECT id FROM public.pickers WHERE profile_id = auth.uid())
  )
);
