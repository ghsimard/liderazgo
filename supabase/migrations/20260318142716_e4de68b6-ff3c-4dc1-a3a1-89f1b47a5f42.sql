ALTER TABLE rubrica_asignaciones ADD COLUMN rubrica_visible boolean NOT NULL DEFAULT false;

UPDATE rubrica_asignaciones SET rubrica_visible = true;

CREATE POLICY "Public can update rubrica_asignaciones"
ON rubrica_asignaciones FOR UPDATE TO public
USING (true) WITH CHECK (true);