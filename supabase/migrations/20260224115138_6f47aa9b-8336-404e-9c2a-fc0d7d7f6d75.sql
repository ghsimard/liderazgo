
-- Explicitly deny UPDATE on deleted_records to preserve audit trail integrity
CREATE POLICY "Deny update on deleted_records"
  ON public.deleted_records FOR UPDATE
  USING (false);
