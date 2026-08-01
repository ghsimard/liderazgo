/**
 * e360Routes.js — routes Express pour le frontend e360 (liderazgo360.co)
 *
 * Écrit pour les tables RÉELLES du schéma e360 de RLT :
 *   licencias, licencias_contrato, licencias_tarifas, licencias_transacciones,
 *   encuestas_360, v_360_dominios, v_360_competencias, v_360_items
 *
 * Aucune table n'est créée. Seule la colonne
 * e360.licencias_contrato.contenido est requise (voir ETAPE-2-migration.sql).
 *
 * Utilisation dans server/index.ts (ou index.js) :
 *   const e360Routes = require('./e360Routes');
 *   app.use('/api', e360Routes(pool));      // AVANT app.get('*', ...)
 */

const { Router } = require('express');

module.exports = function e360Routes(pool) {
  const r = Router();
  const q = (sql, params) => pool.query(sql, params);
  const fail = (res, e) => {
    console.error('[e360]', e);
    res.status(500).json({ error: e.message || 'Error interno' });
  };

  /* ------------------------------------------------ LICENCIAS ------------- */

  // GET /api/licencias/verificar/:cedula
  r.get('/licencias/verificar/:cedula', async (req, res) => {
    try {
      const cedula = String(req.params.cedula).trim();
      const { rows } = await q(
        `SELECT id, cedula, nombres_apellidos AS nombre, correo,
                tipo_licencia AS producto, estado,
                (estado = 'activa') AS activa,
                fecha_asignacion AS fecha_inicio,
                fecha_expiracion  AS fecha_fin,
                (tipo_licencia IN ('administrador','superadmin')) AS es_administrador
           FROM e360.licencias
          WHERE cedula = $1
          ORDER BY fecha_asignacion DESC`,
        [cedula],
      );
      const vigentes = rows.filter(
        (l) => l.activa && (!l.fecha_fin || new Date(l.fecha_fin) > new Date()),
      );
      res.json({
        activa: vigentes.length > 0,
        es_administrador: vigentes.some((l) => l.es_administrador),
        nombre: rows[0]?.nombre ?? null,
        licencias: rows,
      });
    } catch (e) { fail(res, e); }
  });

  // GET /api/licencias
  r.get('/licencias', async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT id, cedula, nombres_apellidos AS nombre, correo,
                tipo_licencia AS producto, estado,
                (estado = 'activa') AS activa,
                fecha_asignacion AS fecha_inicio,
                fecha_expiracion  AS fecha_fin,
                nota,
                (tipo_licencia IN ('administrador','superadmin')) AS es_administrador
           FROM e360.licencias
          ORDER BY fecha_asignacion DESC
          LIMIT 500`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  // POST /api/licencias
  r.post('/licencias', async (req, res) => {
    const client = await pool.connect();
    try {
      const b = req.body || {};
      const cedula = String(b.cedula || '').trim();
      if (!cedula) return res.status(400).json({ error: 'La cédula es obligatoria' });
      const tipo = String(b.producto || b.tipo_licencia || 'rector').trim();

      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO e360.licencias
           (cedula, nombres_apellidos, correo, tipo_licencia, estado, fecha_expiracion, nota, asignada_por)
         VALUES ($1,$2,$3,$4,COALESCE($5,'activa'),$6,$7,$8)
         RETURNING id, cedula, nombres_apellidos AS nombre, correo,
                   tipo_licencia AS producto, estado,
                   fecha_asignacion AS fecha_inicio, fecha_expiracion AS fecha_fin`,
        [
          cedula,
          b.nombre ?? b.nombres_apellidos ?? null,
          b.correo ?? null,
          tipo,
          b.estado ?? null,
          b.fecha_fin ?? b.fecha_expiracion ?? null,
          b.nota ?? null,
          b.asignada_por ?? 'admin-e360',
        ],
      );
      const lic = ins.rows[0];

      const tar = await client.query(
        `SELECT id, precio, moneda FROM e360.licencias_tarifas
          WHERE tipo_licencia = $1 AND vigente_hasta IS NULL
          ORDER BY vigente_desde DESC LIMIT 1`,
        [tipo],
      );
      const t = tar.rows[0];
      await client.query(
        `INSERT INTO e360.licencias_transacciones
           (licencia_id, cedula, tipo_licencia, operacion, cantidad,
            precio_unitario, monto_total, moneda, tarifa_id, estado_nuevo, actor)
         VALUES ($1,$2,$3,'asignacion',1,$4,$4,$5,$6,'activa',$7)`,
        [lic.id, cedula, tipo, t?.precio ?? null, t?.moneda ?? 'COP', t?.id ?? null,
         b.asignada_por ?? 'admin-e360'],
      );
      await client.query('COMMIT');
      res.status(201).json(lic);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      fail(res, e);
    } finally { client.release(); }
  });

  /* -------------------------------------------------- TARIFAS ------------- */

  r.get('/tarifas', async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT id, tipo_licencia AS producto, tipo_licencia AS nombre,
                precio AS valor, moneda, duracion_meses,
                vigente_desde, vigente_hasta,
                (vigente_hasta IS NULL) AS vigente
           FROM e360.licencias_tarifas
          ORDER BY tipo_licencia, vigente_desde DESC`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  // POST /api/tarifas — nouvelle tarifa : clôture la précédente
  r.post('/tarifas', async (req, res) => {
    const client = await pool.connect();
    try {
      const b = req.body || {};
      const tipo = String(b.producto || b.tipo_licencia || '').trim();
      if (!tipo) return res.status(400).json({ error: 'El tipo de licencia es obligatorio' });
      const precio = Number(b.valor ?? b.precio ?? 0);

      await client.query('BEGIN');
      await client.query(
        `UPDATE e360.licencias_tarifas SET vigente_hasta = now()
          WHERE tipo_licencia = $1 AND vigente_hasta IS NULL`,
        [tipo],
      );
      const { rows } = await client.query(
        `INSERT INTO e360.licencias_tarifas
           (tipo_licencia, precio, moneda, duracion_meses, created_by)
         VALUES ($1,$2,COALESCE($3,'COP'),COALESCE($4,12),$5)
         RETURNING id, tipo_licencia AS producto, precio AS valor, moneda,
                   duracion_meses, vigente_desde, true AS vigente`,
        [tipo, precio, b.moneda ?? null, b.duracion_meses ?? null, b.created_by ?? 'admin-e360'],
      );
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      fail(res, e);
    } finally { client.release(); }
  });

  /* --------------------------------------------- TRANSACCIONES ------------ */

  r.get('/transacciones', async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT t.id, t.cedula, l.nombres_apellidos AS nombre,
                t.tipo_licencia AS producto, t.operacion,
                t.monto_total AS valor, t.moneda,
                COALESCE(t.estado_nuevo, t.operacion) AS estado,
                t.id::text AS referencia,
                t.created_at AS fecha, t.created_at AS creado_en, t.nota
           FROM e360.licencias_transacciones t
           LEFT JOIN e360.licencias l ON l.id = t.licencia_id
          ORDER BY t.created_at DESC
          LIMIT 500`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  /* -------------------------------------------------- CONTRATO ------------ */

  r.get('/contrato', async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT id, id::text AS version, nombre_contrato AS titulo, contenido,
                total_rector, total_administrador, fecha_inicio, fecha_fin, estado,
                updated_at AS actualizado_en
           FROM e360.licencias_contrato
          ORDER BY (estado = 'activo') DESC, created_at DESC
          LIMIT 1`,
      );
      res.json(rows[0] ?? {});
    } catch (e) { fail(res, e); }
  });

  r.put('/contrato', async (req, res) => {
    try {
      const b = req.body || {};
      const cur = await q(
        `SELECT id FROM e360.licencias_contrato
          ORDER BY (estado = 'activo') DESC, created_at DESC LIMIT 1`,
      );
      if (!cur.rows[0]) {
        const { rows } = await q(
          `INSERT INTO e360.licencias_contrato (nombre_contrato, contenido)
           VALUES (COALESCE($1,'Contrato e360'), $2)
           RETURNING id, id::text AS version, nombre_contrato AS titulo, contenido,
                     updated_at AS actualizado_en`,
          [b.titulo ?? null, b.contenido ?? null],
        );
        return res.status(201).json(rows[0]);
      }
      const { rows } = await q(
        `UPDATE e360.licencias_contrato
            SET nombre_contrato = COALESCE($2, nombre_contrato),
                contenido       = COALESCE($3, contenido),
                updated_at      = now()
          WHERE id = $1
        RETURNING id, id::text AS version, nombre_contrato AS titulo, contenido,
                  total_rector, total_administrador, fecha_inicio, fecha_fin, estado,
                  updated_at AS actualizado_en`,
        [cur.rows[0].id, b.titulo ?? null, b.contenido ?? null],
      );
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------- ENCUESTA 360 -------------- */

  // POST /api/e360app/respuestas
  r.post('/respuestas', async (req, res) => {
    try {
      const b = req.body || {};
      const cedula = String(b.cedula || '').trim();
      const evaluado = String(b.evaluado_cedula || '').trim();
      if (!cedula || !evaluado) {
        return res.status(400).json({ error: 'Faltan la cédula del evaluador o del evaluado' });
      }
      const respuestas = Array.isArray(b.respuestas) ? b.respuestas : [];
      const { rows } = await q(
        `INSERT INTO e360.encuestas_360
           (tipo_formulario, institucion_educativa, cargo_directivo,
            nombre_directivo, cedula_directivo, cargo_evaluador,
            nombre_completo, cedula, email_evaluador, respuestas, fase)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'inicial'))
         RETURNING id`,
        [
          b.relacion ?? 'autoevaluacion',
          b.institucion ?? b.institucion_educativa ?? 'No especificada',
          b.cargo_directivo ?? 'Rector',
          b.nombre_directivo ?? null,
          evaluado,
          b.relacion ?? null,
          b.nombre ?? b.nombre_completo ?? null,
          cedula,
          b.email ?? null,
          JSON.stringify({ items: respuestas, comentarios: b.comentarios ?? null }),
          b.fase ?? null,
        ],
      );
      res.status(201).json({ id: rows[0].id });
    } catch (e) { fail(res, e); }
  });

  // GET /api/e360/reportes/:cedula
  r.get('/e360/reportes/:cedula', async (req, res) => {
    try {
      const cedula = String(req.params.cedula).trim();
      const { rows } = await q(
        `SELECT tipo_formulario, nombre_directivo, respuestas
           FROM e360.encuestas_360
          WHERE cedula_directivo = $1`,
        [cedula],
      );

      const acc = new Map();   // competencia -> { sum, n, porRelacion }
      const dom = new Map();   // dominio -> { sum, n }
      let sum = 0, n = 0, nombre = null;

      for (const row of rows) {
        nombre = nombre || row.nombre_directivo;
        const payload = row.respuestas || {};
        const items = Array.isArray(payload.items) ? payload.items : [];
        for (const it of items) {
          const v = Number(it.valor);
          if (!Number.isFinite(v)) continue;
          sum += v; n += 1;

          const ck = it.competencia_id ?? 'sin_competencia';
          const c = acc.get(ck) || { sum: 0, n: 0, porRelacion: new Map() };
          c.sum += v; c.n += 1;
          const rel = row.tipo_formulario || 'otro';
          const rr = c.porRelacion.get(rel) || { sum: 0, n: 0 };
          rr.sum += v; rr.n += 1;
          c.porRelacion.set(rel, rr);
          acc.set(ck, c);

          const dk = it.dominio_id ?? 'sin_dominio';
          const d = dom.get(dk) || { sum: 0, n: 0 };
          d.sum += v; d.n += 1;
          dom.set(dk, d);
        }
      }

      const round = (x) => Math.round(x * 100) / 100;
      res.json({
        evaluado: { cedula, nombre },
        total_evaluadores: rows.length,
        promedio_general: n ? round(sum / n) : 0,
        dominios: [...dom].map(([dominio_id, d]) => ({
          dominio_id, promedio: round(d.sum / d.n),
        })),
        competencias: [...acc].map(([competencia_id, c]) => ({
          competencia_id,
          promedio: round(c.sum / c.n),
          por_relacion: Object.fromEntries(
            [...c.porRelacion].map(([k, v]) => [k, round(v.sum / v.n)]),
          ),
        })),
      });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------- ESTRUCTURA 360 (vistas RLT) ----------- */

  r.get('/e360/estructura', async (_req, res) => {
    try {
      const [d, c, i] = await Promise.all([
        q(`SELECT id, key, label, sort_order FROM e360.v_360_dominios ORDER BY sort_order`),
        q(`SELECT id, key, label, domain_id, sort_order FROM e360.v_360_competencias ORDER BY sort_order`),
        q(`SELECT id, item_number, competency_key, response_type, sort_order FROM e360.v_360_items ORDER BY sort_order`),
      ]);
      res.json({ dominios: d.rows, competencias: c.rows, items: i.rows });
    } catch (e) { fail(res, e); }
  });

  return r;
};
