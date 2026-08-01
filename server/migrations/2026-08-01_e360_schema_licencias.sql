-- =====================================================================
-- Encuesta 360 autonome — Schéma dédié `e360` + gestion des licences
-- À EXÉCUTER MANUELLEMENT SUR RENDER (Base de données)
-- Aucune table du schéma `public` (RLT) n'est modifiée.
-- =====================================================================
-- NOTE : script idempotent, exécutable en une fois OU section par section.
-- Volontairement SANS BEGIN/COMMIT : si une section échoue, les précédentes
-- restent en place et l'erreur est localisable.



-- ── 1. Schéma dédié ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS e360;

-- ── 2. Contrat de licences ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS e360.licencias_contrato (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_contrato      text NOT NULL,
  total_rector         integer NOT NULL DEFAULT 150,
  total_administrador  integer NOT NULL DEFAULT 0,
  fecha_inicio         date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin            date,
  estado               text NOT NULL DEFAULT 'activo',   -- activo | suspendido | cerrado
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Tarifs (historisés) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS e360.licencias_tarifas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_licencia    text NOT NULL CHECK (tipo_licencia IN ('rector','administrador')),
  precio           numeric(12,2) NOT NULL DEFAULT 0,
  moneda           text NOT NULL DEFAULT 'COP',
  duracion_meses   integer NOT NULL DEFAULT 12,
  vigente_desde    timestamptz NOT NULL DEFAULT now(),
  vigente_hasta    timestamptz,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_e360_tarifas_tipo_vig
  ON e360.licencias_tarifas (tipo_licencia, vigente_desde DESC);

-- ── 4. Licences (1 siège = 1 utilisateur) ────────────────────────────
CREATE TABLE IF NOT EXISTS e360.licencias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id        uuid REFERENCES e360.licencias_contrato(id) ON DELETE SET NULL,
  cedula             text NOT NULL,
  nombres_apellidos  text,
  correo             text,
  tipo_licencia      text NOT NULL CHECK (tipo_licencia IN ('rector','administrador')),
  estado             text NOT NULL DEFAULT 'activa'
                      CHECK (estado IN ('activa','suspendida','revocada','expirada')),
  fecha_asignacion   timestamptz NOT NULL DEFAULT now(),
  fecha_expiracion   timestamptz,
  asignada_por       text,
  nota               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Un seul siège vivant par (cédula, type)
CREATE UNIQUE INDEX IF NOT EXISTS uq_e360_licencia_viva
  ON e360.licencias (cedula, tipo_licencia)
  WHERE estado NOT IN ('revocada','expirada');

CREATE INDEX IF NOT EXISTS idx_e360_licencias_estado ON e360.licencias (estado);
CREATE INDEX IF NOT EXISTS idx_e360_licencias_cedula ON e360.licencias (cedula);

-- ── 5. Journal des transactions (append-only) ────────────────────────
CREATE TABLE IF NOT EXISTS e360.licencias_transacciones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licencia_id      uuid,
  cedula           text,
  tipo_licencia    text,
  operacion        text NOT NULL,   -- asignacion | renovacion | cambio_tipo | suspension |
                                    -- reactivacion | revocacion | expiracion | ajuste_pool | cambio_tarifa
  cantidad         integer NOT NULL DEFAULT 1,
  precio_unitario  numeric(12,2),
  monto_total      numeric(12,2),
  moneda           text DEFAULT 'COP',
  tarifa_id        uuid,
  periodo_inicio   timestamptz,
  periodo_fin      timestamptz,
  estado_anterior  text,
  estado_nuevo     text,
  actor            text,
  nota             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_e360_tx_created ON e360.licencias_transacciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e360_tx_cedula  ON e360.licencias_transacciones (cedula);
CREATE INDEX IF NOT EXISTS idx_e360_tx_op      ON e360.licencias_transacciones (operacion);

-- Immuabilité du journal
CREATE OR REPLACE FUNCTION e360.fn_bloquear_modificacion_tx()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'El registro de transacciones es de solo inserción';
END; $$;

DROP TRIGGER IF EXISTS trg_e360_tx_inmutable ON e360.licencias_transacciones;
CREATE TRIGGER trg_e360_tx_inmutable
  BEFORE UPDATE OR DELETE ON e360.licencias_transacciones
  FOR EACH ROW EXECUTE FUNCTION e360.fn_bloquear_modificacion_tx();

-- ── 6. Tarif en vigueur ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION e360.fn_tarifa_vigente(_tipo text, _fecha timestamptz DEFAULT now())
RETURNS e360.licencias_tarifas LANGUAGE sql STABLE AS $$
  SELECT t.* FROM e360.licencias_tarifas t
  WHERE t.tipo_licencia = _tipo
    AND t.vigente_desde <= _fecha
    AND (t.vigente_hasta IS NULL OR t.vigente_hasta > _fecha)
  ORDER BY t.vigente_desde DESC
  LIMIT 1;
$$;

-- ── 7. Contrôle du pool de sièges ────────────────────────────────────
CREATE OR REPLACE FUNCTION e360.fn_control_pool()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total   integer;
  v_activas integer;
BEGIN
  IF NEW.estado NOT IN ('activa','suspendida') THEN
    RETURN NEW;
  END IF;

  SELECT CASE WHEN NEW.tipo_licencia = 'rector' THEN c.total_rector
              ELSE c.total_administrador END
    INTO v_total
  FROM e360.licencias_contrato c
  WHERE c.id = NEW.contrato_id;

  IF v_total IS NULL THEN
    RETURN NEW; -- sans contrat rattaché, pas de contrôle
  END IF;

  SELECT count(*) INTO v_activas
  FROM e360.licencias l
  WHERE l.contrato_id = NEW.contrato_id
    AND l.tipo_licencia = NEW.tipo_licencia
    AND l.estado IN ('activa','suspendida')
    AND l.id <> NEW.id;

  IF v_activas + 1 > v_total THEN
    RAISE EXCEPTION 'No hay licencias disponibles para el tipo % (% de % en uso)',
      NEW.tipo_licencia, v_activas, v_total;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_e360_control_pool ON e360.licencias;
CREATE TRIGGER trg_e360_control_pool
  BEFORE INSERT OR UPDATE OF estado, tipo_licencia, contrato_id ON e360.licencias
  FOR EACH ROW EXECUTE FUNCTION e360.fn_control_pool();

-- ── 8. Expiration par défaut + updated_at ────────────────────────────
CREATE OR REPLACE FUNCTION e360.fn_licencia_defaults()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_meses integer;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.fecha_expiracion IS NULL THEN
    SELECT duracion_meses INTO v_meses FROM e360.fn_tarifa_vigente(NEW.tipo_licencia);
    IF v_meses IS NULL AND NEW.tipo_licencia = 'administrador' THEN v_meses := 12; END IF;
    IF v_meses IS NOT NULL THEN
      NEW.fecha_expiracion := NEW.fecha_asignacion + (v_meses || ' months')::interval;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_e360_licencia_defaults ON e360.licencias;
CREATE TRIGGER trg_e360_licencia_defaults
  BEFORE INSERT OR UPDATE ON e360.licencias
  FOR EACH ROW EXECUTE FUNCTION e360.fn_licencia_defaults();

-- ── 9. Journalisation automatique ────────────────────────────────────
CREATE OR REPLACE FUNCTION e360.fn_log_licencia()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_op     text;
  v_tarifa e360.licencias_tarifas;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_op := 'asignacion';
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    v_op := CASE NEW.estado
              WHEN 'suspendida' THEN 'suspension'
              WHEN 'revocada'   THEN 'revocacion'
              WHEN 'expirada'   THEN 'expiracion'
              WHEN 'activa'     THEN 'reactivacion'
            END;
  ELSIF NEW.tipo_licencia IS DISTINCT FROM OLD.tipo_licencia THEN
    v_op := 'cambio_tipo';
  ELSIF NEW.fecha_expiracion IS DISTINCT FROM OLD.fecha_expiracion THEN
    v_op := 'renovacion';
  ELSE
    RETURN NEW;
  END IF;

  SELECT * INTO v_tarifa FROM e360.fn_tarifa_vigente(NEW.tipo_licencia);

  INSERT INTO e360.licencias_transacciones (
    licencia_id, cedula, tipo_licencia, operacion, cantidad,
    precio_unitario, monto_total, moneda, tarifa_id,
    periodo_inicio, periodo_fin, estado_anterior, estado_nuevo, actor
  ) VALUES (
    NEW.id, NEW.cedula, NEW.tipo_licencia, v_op, 1,
    CASE WHEN v_op IN ('asignacion','renovacion','cambio_tipo') THEN v_tarifa.precio ELSE 0 END,
    CASE WHEN v_op IN ('asignacion','renovacion','cambio_tipo') THEN v_tarifa.precio ELSE 0 END,
    COALESCE(v_tarifa.moneda, 'COP'), v_tarifa.id,
    NEW.fecha_asignacion, NEW.fecha_expiracion,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.estado END, NEW.estado,
    COALESCE(NEW.asignada_por, 'sistema')
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_e360_log_licencia ON e360.licencias;
CREATE TRIGGER trg_e360_log_licencia
  AFTER INSERT OR UPDATE ON e360.licencias
  FOR EACH ROW EXECUTE FUNCTION e360.fn_log_licencia();

-- ── 10. Expiration automatique (à appeler périodiquement) ────────────
CREATE OR REPLACE FUNCTION e360.fn_expirar_licencias()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v_count integer;
BEGIN
  UPDATE e360.licencias
     SET estado = 'expirada'
   WHERE estado IN ('activa','suspendida')
     AND fecha_expiracion IS NOT NULL
     AND fecha_expiracion < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

-- ── 11. Vue de synthèse ──────────────────────────────────────────────
CREATE OR REPLACE VIEW e360.v_licencias_resumen AS
SELECT
  c.id AS contrato_id,
  c.nombre_contrato,
  t.tipo_licencia,
  CASE WHEN t.tipo_licencia = 'rector' THEN c.total_rector ELSE c.total_administrador END AS total,
  count(*) FILTER (WHERE l.estado = 'activa')      AS activas,
  count(*) FILTER (WHERE l.estado = 'suspendida')  AS suspendidas,
  count(*) FILTER (WHERE l.estado = 'revocada')    AS revocadas,
  count(*) FILTER (WHERE l.estado = 'expirada')    AS expiradas,
  (CASE WHEN t.tipo_licencia = 'rector' THEN c.total_rector ELSE c.total_administrador END)
    - count(*) FILTER (WHERE l.estado IN ('activa','suspendida')) AS disponibles
FROM e360.licencias_contrato c
CROSS JOIN (VALUES ('rector'),('administrador')) AS t(tipo_licencia)
LEFT JOIN e360.licencias l
       ON l.contrato_id = c.id AND l.tipo_licencia = t.tipo_licencia
GROUP BY c.id, c.nombre_contrato, t.tipo_licencia, c.total_rector, c.total_administrador;

-- ── 12. Configuration 360 partagée (lecture depuis `public`) ─────────
CREATE OR REPLACE VIEW e360.v_360_dominios     AS SELECT * FROM public.domains_360;
CREATE OR REPLACE VIEW e360.v_360_competencias AS SELECT * FROM public.competencies_360;
CREATE OR REPLACE VIEW e360.v_360_items        AS SELECT * FROM public.items_360;
CREATE OR REPLACE VIEW e360.v_360_item_texts   AS SELECT * FROM public.item_texts_360;
CREATE OR REPLACE VIEW e360.v_360_ponderaciones AS SELECT * FROM public.competency_weights;

-- ── 13. Données propres à e360 (invisibles depuis le site RLT) ───────
CREATE TABLE IF NOT EXISTS e360.encuestas_360           (LIKE public.encuestas_360 INCLUDING ALL);
CREATE TABLE IF NOT EXISTS e360.encuesta_invitaciones   (LIKE public.encuesta_invitaciones INCLUDING ALL);
CREATE TABLE IF NOT EXISTS e360.encuesta_360_visibility (LIKE public.encuesta_360_visibility INCLUDING ALL);
CREATE TABLE IF NOT EXISTS e360.fichas_rlt              (LIKE public.fichas_rlt INCLUDING ALL);

-- ── 14. Données initiales ────────────────────────────────────────────
INSERT INTO e360.licencias_contrato (nombre_contrato, total_rector, total_administrador)
SELECT 'Contrato inicial Encuesta 360', 150, 5
WHERE NOT EXISTS (SELECT 1 FROM e360.licencias_contrato);

INSERT INTO e360.licencias_tarifas (tipo_licencia, precio, moneda, duracion_meses, created_by)
SELECT 'rector', 0, 'COP', 12, 'migration'
WHERE NOT EXISTS (SELECT 1 FROM e360.licencias_tarifas WHERE tipo_licencia = 'rector');

INSERT INTO e360.licencias_tarifas (tipo_licencia, precio, moneda, duracion_meses, created_by)
SELECT 'administrador', 0, 'COP', 12, 'migration'
WHERE NOT EXISTS (SELECT 1 FROM e360.licencias_tarifas WHERE tipo_licencia = 'administrador');

-- ── 15. Droits (rôle applicatif du proxy Express) ────────────────────
-- Compatible avec toutes les versions de PostgreSQL (GRANT ... TO CURRENT_USER
-- n'existe qu'à partir de PG 14).
DO $grants$
DECLARE r text := current_user;
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA e360 TO %I', r);
  EXECUTE format('GRANT ALL ON ALL TABLES    IN SCHEMA e360 TO %I', r);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA e360 TO %I', r);
  EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA e360 TO %I', r);
END $grants$;
-- Si le proxy se connecte avec un autre rôle, remplacer current_user par ce rôle.



-- Cession future au client :
--   pg_dump --schema=e360 ...
--   (au préalable, matérialiser les vues v_360_* en tables pour rendre la base autonome)
