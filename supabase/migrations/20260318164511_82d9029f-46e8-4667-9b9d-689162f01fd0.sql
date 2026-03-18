ALTER TABLE rubrica_asignaciones 
  ADD COLUMN IF NOT EXISTS encuesta_entrada_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encuesta_salida_visible boolean NOT NULL DEFAULT false;

UPDATE rubrica_asignaciones SET encuesta_entrada_visible = true, encuesta_salida_visible = true;