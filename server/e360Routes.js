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
 *   const { pool } = require('./db');
 *   const e360Routes = require('./e360Routes');
 *   app.use('/api/e360app', e360Routes(pool));   // AVANT app.get('*', ...)
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

  // POST /licencias/acceso — ingreso por cédula.
  // El rector que entra por primera vez recibe su licencia (creada y activada
  // en ese momento). Si ya existe, se reutiliza la misma cuenta.
  r.post('/licencias/acceso', async (req, res) => {
    const client = await pool.connect();
    try {
      const b = req.body || {};
      const cedula = String(b.cedula || '').trim();
      if (!cedula) return res.status(400).json({ error: 'La cédula es obligatoria' });

      await client.query('BEGIN');

      let { rows } = await client.query(
        `SELECT id, tipo_licencia, estado, fecha_asignacion, fecha_expiracion
           FROM e360.licencias
          WHERE cedula = $1
          ORDER BY fecha_asignacion DESC NULLS LAST`,
        [cedula],
      );

      const tarifaDe = async (tipo) => {
        const { rows: t } = await client.query(
          `SELECT id, precio, moneda, duracion_meses FROM e360.licencias_tarifas
            WHERE tipo_licencia = $1 AND vigente_hasta IS NULL
            ORDER BY vigente_desde DESC LIMIT 1`,
          [tipo],
        );
        return t[0] || null;
      };

      if (rows.length === 0) {
        // Primer ingreso de un rector: se crea y se activa la licencia ahora.
        const t = await tarifaDe('rector');
        const meses = t?.duracion_meses ?? 12;
        const ins = await client.query(
          `INSERT INTO e360.licencias
             (cedula, nombres_apellidos, correo, tipo_licencia, estado,
              fecha_asignacion, fecha_expiracion, asignada_por, nota)
           VALUES ($1,$2,$3,'rector','activa', now(), now() + ($4 || ' months')::interval,
                   'autoservicio', 'Licencia iniciada en el primer ingreso')
           RETURNING id`,
          [cedula, b.nombre ?? null, b.correo ?? null, String(meses)],
        );
        await client.query(
          `INSERT INTO e360.licencias_transacciones
             (licencia_id, cedula, tipo_licencia, operacion, cantidad,
              precio_unitario, monto_total, moneda, tarifa_id, estado_nuevo, actor, nota)
           VALUES ($1,$2,'rector','asignacion',1,$3,$3,$4,$5,'activa','autoservicio',
                   'Inicio de licencia en el primer ingreso')`,
          [ins.rows[0].id, cedula, t?.precio ?? null, t?.moneda ?? 'COP', t?.id ?? null],
        );
      } else {
        // Licencia existente que aún no ha iniciado: se inicia ahora.
        const pendientes = rows.filter(
          (l) => l.tipo_licencia === 'rector' && (!l.fecha_asignacion || l.estado === 'pendiente'),
        );
        for (const l of pendientes) {
          const t = await tarifaDe(l.tipo_licencia);
          const meses = t?.duracion_meses ?? 12;
          await client.query(
            `UPDATE e360.licencias
                SET estado = 'activa',
                    fecha_asignacion = COALESCE(fecha_asignacion, now()),
                    fecha_expiracion = COALESCE(fecha_expiracion,
                                                now() + ($2 || ' months')::interval)
              WHERE id = $1`,
            [l.id, String(meses)],
          );
          await client.query(
            `INSERT INTO e360.licencias_transacciones
               (licencia_id, cedula, tipo_licencia, operacion, cantidad,
                estado_anterior, estado_nuevo, actor, nota)
             VALUES ($1,$2,$3,'activacion',1,$4,'activa','autoservicio',
                     'Licencia iniciada en el primer ingreso')`,
            [l.id, cedula, l.tipo_licencia, l.estado ?? null],
          );
        }
      }

      await client.query('COMMIT');

      const final = await q(
        `SELECT id, cedula, nombres_apellidos AS nombre, correo,
                tipo_licencia AS producto, estado,
                (estado = 'activa') AS activa,
                fecha_asignacion AS fecha_inicio,
                fecha_expiracion  AS fecha_fin,
                (tipo_licencia IN ('administrador','superadmin')) AS es_administrador
           FROM e360.licencias
          WHERE cedula = $1
          ORDER BY fecha_asignacion DESC NULLS LAST`,
        [cedula],
      );
      const vigentes = final.rows.filter(
        (l) => l.activa && (!l.fecha_fin || new Date(l.fecha_fin) > new Date()),
      );
      res.json({
        activa: vigentes.length > 0,
        es_administrador: vigentes.some((l) => l.es_administrador),
        nombre: final.rows[0]?.nombre ?? null,
        licencias: final.rows,
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      fail(res, e);
    } finally { client.release(); }
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

  // POST /api/e360/respuestas
  r.post('/respuestas', async (req, res) => {
    try {
      const b = req.body || {};
      const cedula = String(b.cedula || '').trim();
      const evaluado = String(b.evaluado_cedula || '').trim();
      if (!cedula || !evaluado) {
        return res.status(400).json({ error: 'Faltan la cédula del evaluador o del evaluado' });
      }
      const fase = b.fase ?? 'inicial';
      // Como en RLT/360: una sola autoevaluación por cédula y fase.
      if ((b.relacion ?? 'autoevaluacion') === 'autoevaluacion') {
        const dup = await q(
          `SELECT 1 FROM e360.encuestas_360
            WHERE cedula = $1 AND tipo_formulario = 'autoevaluacion'
              AND COALESCE(fase,'inicial') = $2
            LIMIT 1`,
          [cedula, fase],
        );
        if (dup.rows.length) {
          return res.status(409).json({
            error: `Ya existe una autoevaluación ${fase === 'inicial' ? 'de entrada' : 'de salida'} registrada con esta cédula.`,
          });
        }
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
          JSON.stringify({
            items: respuestas,
            comentarios: b.comentarios ?? null,
            dias_contacto: b.dias_contacto ?? null,
          }),
          b.fase ?? null,
        ],
      );
      res.status(201).json({ id: rows[0].id });
    } catch (e) { fail(res, e); }
  });

  // GET /api/e360/respuestas/conteos?evaluado=&fase=
  // Número de respuestas registradas por tipo de formulario (cuotas del hub).
  r.get('/respuestas/conteos', async (req, res) => {
    try {
      const evaluado = String(req.query.evaluado || '').trim();
      const fase = String(req.query.fase || 'inicial');
      if (!evaluado) return res.status(400).json({ error: 'Falta la cédula del evaluado' });
      const { rows } = await q(
        `SELECT tipo_formulario, count(*)::int AS total
           FROM e360.encuestas_360
          WHERE cedula_directivo = $1 AND COALESCE(fase,'inicial') = $2
          GROUP BY tipo_formulario`,
        [evaluado, fase],
      );
      const conteos = {};
      for (const row of rows) conteos[row.tipo_formulario] = row.total;
      res.json({ conteos });
    } catch (e) { fail(res, e); }
  });

  // GET /api/e360/respuestas/autoevaluacion/:cedula?fase=
  // Lectura de la propia autoevaluación (visor de solo lectura).
  r.get('/respuestas/autoevaluacion/:cedula', async (req, res) => {
    try {
      const cedula = String(req.params.cedula).trim();
      const fase = String(req.query.fase || 'inicial');
      const { rows } = await q(
        `SELECT respuestas, created_at
           FROM e360.encuestas_360
          WHERE cedula = $1 AND tipo_formulario = 'autoevaluacion'
            AND COALESCE(fase,'inicial') = $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [cedula, fase],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Sin autoevaluación registrada' });
      const payload = rows[0].respuestas || {};
      res.json({
        creada: rows[0].created_at,
        items: Array.isArray(payload.items) ? payload.items : [],
        comentarios: payload.comentarios ?? null,
      });
    } catch (e) { fail(res, e); }
  });

  // GET /api/e360/reportes/:cedula
  r.get('/reportes/:cedula', async (req, res) => {
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

  r.get('/estructura', async (req, res) => {
    try {
      const tipo = String(req.query?.tipo || 'autoevaluacion');
      // Vue enrichie (ETAPE-4) si elle existe, sinon la vue d'origine.
      const dominiosQuery = async () => {
        try {
          return await q(`SELECT * FROM e360.v_360_dominios_desc ORDER BY sort_order`);
        } catch {
          return await q(`SELECT * FROM e360.v_360_dominios ORDER BY sort_order`);
        }
      };
      const [d, c, i] = await Promise.all([
        dominiosQuery(),
        q(`SELECT * FROM e360.v_360_competencias ORDER BY sort_order`),
        q(`SELECT * FROM e360.v_360_items ORDER BY sort_order`),
      ]);

      // Textos de los enunciados: item_texts_360, por form_type (como RLT/360).
      const textos = await textosPorItem();
      const textoDe = (row) => {
        for (const k of ['id', 'item_id', 'item_number', 'key']) {
          const t = textos.get(String(row[k]));
          if (t) return t[tipo] || t['autoevaluacion'] || Object.values(t).find(Boolean) || null;
        }
        return null;
      };

      const pick = (row, keys) => {
        for (const k of keys) {
          const v = row[k];
          if (v != null && String(v).trim() !== '') return String(v);
        }
        return null;
      };

      const itemsPorCompetencia = new Map();
      for (const it of i.rows) {
        const rawKey = String(
          pick(it, ['competency_key', 'competencia_key', 'competency_id', 'competencia_id']) ?? '',
        );
        // En RLT los ítems suelen referenciar la competencia con sufijo (ej. autoconciencia_1).
        const key = rawKey.replace(/_\d+$/, '');
        const texto =
          textoDe(it) ??
          pick(it, ['statement_text', 'texto', 'label', 'enunciado', 'pregunta', 'item_text']) ??
          `Enunciado ${pick(it, ['item_number', 'id']) ?? ''}`.trim();
        const list = itemsPorCompetencia.get(key) || [];
        list.push({
          id: String(pick(it, ['key', 'id', 'item_number'])),
          texto,
          competencia_id: key,
        });
        itemsPorCompetencia.set(key, list);
      }


      const competenciasPorDominio = new Map();
      for (const co of c.rows) {
        const key = String(pick(co, ['key', 'id']));
        const dominioRef = String(pick(co, ['domain_key', 'domain_id', 'dominio_id']) ?? '');
        const list = competenciasPorDominio.get(dominioRef) || [];
        list.push({
          id: key,
          nombre: pick(co, ['label', 'nombre', 'name']) ?? key,
          items: itemsPorCompetencia.get(key) ?? [],
        });
        competenciasPorDominio.set(dominioRef, list);
      }

      const dominios = d.rows.map((dm) => {
        const key = String(pick(dm, ['key', 'id']));
        const byKey = competenciasPorDominio.get(key) ?? [];
        const byId = competenciasPorDominio.get(String(dm.id)) ?? [];
        return {
          id: key,
          nombre: pick(dm, ['label', 'nombre', 'name']) ?? key,
          descripcion: pick(dm, ['description', 'descripcion']) ?? '',
          competencias: byKey.length ? byKey : byId,
        };
      });

      res.json({
        escala: [
          { valor: 1, etiqueta: 'Nunca' },
          { valor: 2, etiqueta: 'Rara vez' },
          { valor: 3, etiqueta: 'A veces' },
          { valor: 4, etiqueta: 'Frecuentemente' },
          { valor: 5, etiqueta: 'Siempre' },
        ],
        relaciones: [
          { valor: 'autoevaluacion', etiqueta: 'Autoevaluación' },
          { valor: 'directivo', etiqueta: 'Directivo Par' },
          { valor: 'docente', etiqueta: 'Docente' },
          { valor: 'administrativo', etiqueta: 'Administrativo' },
          { valor: 'estudiante', etiqueta: 'Estudiante' },
          { valor: 'acudiente', etiqueta: 'Acudiente' },
        ],
        dominios,
      });
    } catch (e) { fail(res, e); }
  });

  /* ======================================================================
   *  ADMINISTRACIÓN  (correo + contraseña, roles, config, evaluados, informes)
   *  Requiere ETAPE-6-admin.sql
   * ==================================================================== */

  const crypto = require('crypto');

  /** Resuelve el esquema real de una tabla base (e360 o public). */
  const tablaCache = new Map();
  async function tabla(nombre) {
    if (tablaCache.has(nombre)) return tablaCache.get(nombre);
    const { rows } = await q(
      `SELECT table_schema FROM information_schema.tables
        WHERE table_name = $1 AND table_schema IN ('e360','public')
        ORDER BY (table_schema = 'e360') DESC LIMIT 1`,
      [nombre],
    );
    if (!rows[0]) throw new Error(`La tabla ${nombre} no existe en la base de datos`);
    const full = `${rows[0].table_schema}."${nombre}"`;
    tablaCache.set(nombre, full);
    return full;
  }

  const log = (admin, accion, detalle) =>
    q(
      `INSERT INTO e360.admin_actividad (admin_id, correo, accion, detalle)
       VALUES ($1,$2,$3,$4)`,
      [admin?.id ?? null, admin?.correo ?? null, accion, detalle ?? null],
    ).catch(() => {});

  /* ---------------- textos de los enunciados (item_texts_360) -------------- */
  // En RLT/360 el texto de cada enunciado vive en item_texts_360, con una fila
  // por (item_id, form_type). items_360 no tiene columna de texto.

  const FORM_TYPES_BASE = [
    'autoevaluacion', 'docente', 'estudiante', 'directivo', 'acudiente', 'administrativo',
  ];

  async function formTypes() {
    try {
      const t = await tabla('item_texts_360');
      const { rows } = await q(
        `SELECT DISTINCT form_type FROM ${t} WHERE form_type IS NOT NULL`,
      );
      const extra = rows
        .map((x) => String(x.form_type))
        .filter((ft) => !FORM_TYPES_BASE.includes(ft));
      return [...FORM_TYPES_BASE, ...extra.sort()];
    } catch {
      return FORM_TYPES_BASE;
    }
  }

  // Map: item_id -> { form_type: texto }
  async function textosPorItem() {
    const map = new Map();
    let rows = [];
    try {
      const r1 = await q(`SELECT item_id, form_type, text FROM e360.v_360_item_texts`);
      rows = r1.rows;
    } catch {
      try {
        const t = await tabla('item_texts_360');
        const r2 = await q(`SELECT item_id, form_type, text FROM ${t}`);
        rows = r2.rows;
      } catch { return map; }
    }
    for (const row of rows) {
      const k = String(row.item_id);
      const obj = map.get(k) || {};
      obj[String(row.form_type)] = row.text ?? '';
      map.set(k, obj);
    }
    return map;
  }

  async function guardarTextoItem(itemId, formType, texto) {
    return guardarTextoItemImpl(itemId, formType, texto);
  }

  // Map: item_id -> peso (tabla propia de e360, ver ETAPE-9)
  async function pesosPorItem() {
    const map = new Map();
    try {
      const { rows } = await q(`SELECT item_id, peso FROM e360.item_ponderaciones`);
      for (const row of rows) map.set(String(row.item_id), Number(row.peso));
    } catch { /* tabla aún no creada */ }
    return map;
  }

  async function guardarPesoItem(itemId, peso) {
    await q(
      `INSERT INTO e360.item_ponderaciones (item_id, peso, updated_at)
       VALUES ($1::text, $2, now())
       ON CONFLICT (item_id) DO UPDATE SET peso = EXCLUDED.peso, updated_at = now()`,
      [String(itemId), Number(peso)],
    );
  }

  async function guardarTextoItemImpl(itemId, formType, texto) {
    const t = await tabla('item_texts_360');
    try {
      await q(
        `INSERT INTO ${t} (item_id, form_type, text) VALUES ($1,$2,$3)
         ON CONFLICT (item_id, form_type) DO UPDATE SET text = EXCLUDED.text`,
        [itemId, formType, texto],
      );
    } catch {
      // Sin restricción única en (item_id, form_type): update y si no existe, insert.
      const upd = await q(
        `UPDATE ${t} SET text = $3 WHERE item_id::text = $1::text AND form_type = $2`,
        [String(itemId), formType, texto],
      );
      if (upd.rowCount === 0) {
        await q(`INSERT INTO ${t} (item_id, form_type, text) VALUES ($1,$2,$3)`,
          [itemId, formType, texto]);
      }
    }
  }

  async function adminDeToken(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    const { rows } = await q(
      `SELECT a.id, a.correo, a.nombre, a.rol, a.activo
         FROM e360.admin_sesiones s
         JOIN e360.admins a ON a.id = s.admin_id
        WHERE s.token = $1 AND s.expira_en > now() AND a.activo`,
      [token],
    );
    return rows[0] ?? null;
  }

  const requireAdmin = async (req, res, next) => {
    try {
      const admin = await adminDeToken(req);
      if (!admin) return res.status(401).json({ error: 'Sesión de administrador requerida' });
      req.admin = admin;
      next();
    } catch (e) { fail(res, e); }
  };

  const requireEscritura = (req, res, next) =>
    req.admin.rol === 'lector'
      ? res.status(403).json({ error: 'Tu rol solo permite consultar' })
      : next();

  const requireSuperadmin = (req, res, next) =>
    req.admin.rol !== 'superadmin'
      ? res.status(403).json({ error: 'Solo el superadmin puede hacer esto' })
      : next();

  /* ------------------------------------------------------------- sesión ---- */

  /** ¿La cédula pertenece a un administrador? (usado en la página de inicio) */
  r.post('/admin/verificar-cedula', async (req, res) => {
    try {
      const cedula = String(req.body?.cedula || '').trim();
      if (!cedula) return res.status(400).json({ error: 'Cédula obligatoria' });
      const { rows } = await q(
        `SELECT correo, nombre, rol FROM e360.admins
          WHERE cedula = $1 AND activo = true LIMIT 1`,
        [cedula],
      );
      const a = rows[0];
      if (!a) return res.json({ es_admin: false });
      res.json({ es_admin: true, correo: a.correo, nombre: a.nombre, rol: a.rol });
    } catch (e) {
      // Si la columna cedula aún no existe, no bloquea el ingreso normal.
      if (e && e.code === '42703') return res.json({ es_admin: false });
      fail(res, e);
    }
  });

  r.post('/admin/login', async (req, res) => {
    try {
      const correo = String(req.body?.correo || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!correo || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
      }
      const { rows } = await q(
        `SELECT id, correo, nombre, rol, activo,
                (password_hash = crypt($2, password_hash)) AS ok
           FROM e360.admins WHERE lower(correo) = $1`,
        [correo, password],
      );
      const a = rows[0];
      if (!a || !a.ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      if (!a.activo) return res.status(403).json({ error: 'Cuenta desactivada' });

      const token = crypto.randomBytes(32).toString('hex');
      await q(
        `INSERT INTO e360.admin_sesiones (token, admin_id, expira_en)
         VALUES ($1,$2, now() + interval '12 hours')`,
        [token, a.id],
      );
      await q(`UPDATE e360.admins SET ultimo_ingreso = now() WHERE id = $1`, [a.id]);
      await log(a, 'login', 'Ingreso al panel');
      res.json({ token, admin: { id: a.id, correo: a.correo, nombre: a.nombre, rol: a.rol } });
    } catch (e) { fail(res, e); }
  });

  r.post('/admin/logout', requireAdmin, async (req, res) => {
    try {
      const h = req.headers.authorization || '';
      await q(`DELETE FROM e360.admin_sesiones WHERE token = $1`, [h.slice(7)]);
      await log(req.admin, 'logout', null);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  r.get('/admin/me', requireAdmin, (req, res) => res.json({ admin: req.admin }));

  /** Cambio de contraseña propia desde el panel (requiere contraseña actual). */
  r.put('/admin/me/password', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const actual = String(req.body?.actual || '');
      const nueva = String(req.body?.nueva || '');
      if (!actual || !nueva) {
        return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
      }
      if (nueva.length < 8) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
      }
      const { rows } = await q(
        `UPDATE e360.admins
            SET password_hash = crypt($3, gen_salt('bf')), updated_at = now()
          WHERE id = $1 AND activo = true AND password_hash = crypt($2, password_hash)
        RETURNING id, correo, nombre, rol`,
        [req.admin.id, actual, nueva],
      );
      if (!rows[0]) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

      // Cierra las demás sesiones abiertas del mismo admin; la actual sigue válida.
      const h = req.headers.authorization || '';
      await q(
        `DELETE FROM e360.admin_sesiones WHERE admin_id = $1 AND token <> $2`,
        [req.admin.id, h.slice(7)],
      );
      await log(rows[0], 'password_cambiado', rows[0].correo);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });


  /* ------------------------------- restablecer contraseña (por correo) ---- */

  const APP_URL = (process.env.E360_APP_URL || 'https://liderazgo360.co').replace(/\/$/, '');
  const CORREO_REMITENTE = process.env.E360_CORREO_REMITENTE || 'no-reply@liderazgo360.co';

  /** Envía el correo por Resend (HTTP) o por SMTP (nodemailer) según variables de entorno. */
  async function enviarCorreo({ to, subject, html }) {
    if (process.env.RESEND_API_KEY) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: CORREO_REMITENTE, to: [to], subject, html }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        if (resp.status === 403 && body.includes('domain is not verified')) {
          throw new Error(
            `El dominio ${CORREO_REMITENTE.split('@')[1]} no está verificado en Resend. ` +
            'Ve a https://resend.com/domains, añade el dominio y copia los registros DNS que indica Resend. ' +
            'Mientras tanto, configura E360_CORREO_REMITENTE=onboarding@resend.dev en Render solo para pruebas (solo llega al correo dueño de la cuenta Resend).'
          );
        }
        throw new Error(`Resend ${resp.status}: ${body}`);
      }
      return;
    }
    if (process.env.SMTP_HOST) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '') === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      await transport.sendMail({ from: CORREO_REMITENTE, to, subject, html });
      return;
    }
    throw new Error('No hay proveedor de correo configurado (RESEND_API_KEY o SMTP_HOST)');
  }

  const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

  /** Solicitud de restablecimiento. Respuesta siempre neutra (no revela cuentas). */
  r.post('/admin/password/solicitar', async (req, res) => {
    const neutro = { ok: true };
    try {
      const correo = String(req.body?.correo || '').trim().toLowerCase();
      if (!correo) return res.status(400).json({ error: 'Correo obligatorio' });

      const { rows } = await q(
        `SELECT id, correo, nombre FROM e360.admins
          WHERE lower(correo) = $1 AND activo = true LIMIT 1`,
        [correo],
      );
      const a = rows[0];
      if (!a) return res.json(neutro);

      // Sin límite de solicitudes: cada petición envía un enlace nuevo.
      const token = crypto.randomBytes(32).toString('hex');
      await q(
        `INSERT INTO e360.admin_password_resets (admin_id, token_hash, expira_en, ip)
         VALUES ($1,$2, now() + interval '1 hour', $3)`,
        [a.id, hashToken(token), req.ip ?? null],
      );

      const enlace = `${APP_URL}/admin/restablecer?token=${token}`;
      await enviarCorreo({
        to: a.correo,
        subject: 'Restablecer tu contraseña de administración e360',
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
          <h2 style="margin:0 0 12px">Restablecer contraseña</h2>
          <p>Hola${a.nombre ? ` ${a.nombre}` : ''}, recibimos una solicitud para restablecer la
          contraseña de tu cuenta de administración de <strong>e360</strong>.</p>
          <p><a href="${enlace}" style="display:inline-block;background:#0f766e;color:#ffffff;
            padding:12px 20px;border-radius:8px;text-decoration:none">Crear nueva contraseña</a></p>
          <p style="font-size:13px;color:#475569">El enlace vence en 1 hora y solo puede usarse una vez.
          Si no solicitaste el cambio, puedes ignorar este mensaje.</p>
        </div>`,
      });
      await log(a, 'password_reset_solicitado', a.correo);
      res.json(neutro);
    } catch (e) { fail(res, e); }
  });

  /** ¿El token sigue siendo válido? (para mostrar el formulario) */
  r.get('/admin/password/verificar', async (req, res) => {
    try {
      const token = String(req.query?.token || '');
      if (!token) return res.status(400).json({ error: 'Token obligatorio' });
      const { rows } = await q(
        `SELECT a.correo FROM e360.admin_password_resets p
           JOIN e360.admins a ON a.id = p.admin_id
          WHERE p.token_hash = $1 AND p.usado_en IS NULL AND p.expira_en > now() AND a.activo`,
        [hashToken(token)],
      );
      if (!rows[0]) return res.status(400).json({ error: 'El enlace no es válido o ya venció' });
      res.json({ valido: true, correo: rows[0].correo });
    } catch (e) { fail(res, e); }
  });

  /** Aplica la nueva contraseña y cierra todas las sesiones abiertas. */
  r.post('/admin/password/restablecer', async (req, res) => {
    try {
      const token = String(req.body?.token || '');
      const password = String(req.body?.password || '');
      if (!token) return res.status(400).json({ error: 'Token obligatorio' });
      if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      const { rows } = await q(
        `UPDATE e360.admin_password_resets p
            SET usado_en = now()
          WHERE p.token_hash = $1 AND p.usado_en IS NULL AND p.expira_en > now()
        RETURNING p.admin_id`,
        [hashToken(token)],
      );
      const adminId = rows[0]?.admin_id;
      if (!adminId) return res.status(400).json({ error: 'El enlace no es válido o ya venció' });

      const { rows: upd } = await q(
        `UPDATE e360.admins
            SET password_hash = crypt($2, gen_salt('bf')), updated_at = now()
          WHERE id = $1 AND activo = true
        RETURNING id, correo, nombre, rol`,
        [adminId, password],
      );
      if (!upd[0]) return res.status(400).json({ error: 'Cuenta no disponible' });

      await q(`DELETE FROM e360.admin_sesiones WHERE admin_id = $1`, [adminId]);
      await log(upd[0], 'password_restablecido', upd[0].correo);
      res.json({ ok: true, correo: upd[0].correo });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------------- usuarios y roles ------ */

  r.get('/admin/usuarios', requireAdmin, requireSuperadmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT id, correo, nombre, cedula, rol, activo, ultimo_ingreso, created_at
           FROM e360.admins ORDER BY created_at`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  r.post('/admin/usuarios', requireAdmin, requireSuperadmin, async (req, res) => {
    try {
      const b = req.body || {};
      const correo = String(b.correo || '').trim().toLowerCase();
      const password = String(b.password || '');
      const cedula = String(b.cedula || '').replace(/\D/g, '');
      if (!correo || password.length < 8) {
        return res.status(400).json({ error: 'Correo y contraseña (mínimo 8 caracteres) requeridos' });
      }
      if (!cedula || cedula.length < 5 || cedula.length > 12) {
        return res.status(400).json({ error: 'Cédula requerida (entre 5 y 12 dígitos)' });
      }
      const dup = await q(`SELECT 1 FROM e360.admins WHERE cedula = $1 LIMIT 1`, [cedula]);
      if (dup.rows[0]) {
        return res.status(409).json({ error: 'Esa cédula ya está asociada a otra cuenta' });
      }
      const { rows } = await q(
        `INSERT INTO e360.admins (correo, nombre, cedula, password_hash, rol)
         VALUES ($1,$2,$3, crypt($4, gen_salt('bf')), COALESCE($5,'admin'))
         RETURNING id, correo, nombre, cedula, rol, activo, created_at`,
        [correo, b.nombre ?? null, cedula, password, b.rol ?? null],
      );
      await log(req.admin, 'usuario_creado', correo);
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/usuarios/:id', requireAdmin, requireSuperadmin, async (req, res) => {
    try {
      const b = req.body || {};
      const cedula = b.cedula === undefined || b.cedula === null
        ? null
        : String(b.cedula).replace(/\D/g, '') || null;
      const { rows } = await q(
        `UPDATE e360.admins
            SET nombre = COALESCE($2, nombre),
                rol    = COALESCE($3, rol),
                activo = COALESCE($4, activo),
                cedula = COALESCE($6, cedula),
                password_hash = CASE WHEN $5 <> '' THEN crypt($5, gen_salt('bf'))
                                     ELSE password_hash END,
                updated_at = now()
          WHERE id = $1
        RETURNING id, correo, nombre, cedula, rol, activo, ultimo_ingreso, created_at`,
        [req.params.id, b.nombre ?? null, b.rol ?? null,
         typeof b.activo === 'boolean' ? b.activo : null, String(b.password || ''), cedula],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
      await log(req.admin, 'usuario_actualizado', rows[0].correo);
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.delete('/admin/usuarios/:id', requireAdmin, requireSuperadmin, async (req, res) => {
    try {
      if (req.params.id === req.admin.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }
      await q(`DELETE FROM e360.admins WHERE id = $1`, [req.params.id]);
      await log(req.admin, 'usuario_eliminado', req.params.id);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  r.get('/admin/actividad', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT id, correo, accion, detalle, created_at
           FROM e360.admin_actividad ORDER BY created_at DESC LIMIT 200`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  /* -------------------------------------- configuración del cuestionario -- */

  r.get('/admin/config', requireAdmin, async (_req, res) => {
    try {
      const [d, c, i, w] = await Promise.all([
        q(`SELECT * FROM ${await tabla('domains_360')} ORDER BY sort_order NULLS LAST`),
        q(`SELECT * FROM ${await tabla('competencies_360')} ORDER BY sort_order NULLS LAST`),
        q(`SELECT * FROM ${await tabla('items_360')} ORDER BY competency_key, sort_order NULLS LAST`),
        q(`SELECT * FROM ${await tabla('competency_weights')} ORDER BY competency_key`).catch(() => ({ rows: [] })),
      ]);

      // Los textos de los enunciados viven en item_texts_360 (uno por form_type),
      // igual que en RLT/360.
      const textos = await textosPorItem();
      const pesos = await pesosPorItem();
      const items = i.rows.map((it) => ({
        ...it,
        textos: textos.get(String(it.id)) ?? {},
        ponderacion: pesos.has(String(it.id)) ? pesos.get(String(it.id)) : 1,
      }));

      res.json({
        dominios: d.rows,
        competencias: c.rows,
        items,
        ponderaciones: w.rows,
        form_types: await formTypes(),
      });
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/dominios/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const b = req.body || {};
      const { rows } = await q(
        `UPDATE ${await tabla('domains_360')}
            SET label = COALESCE($2, label), sort_order = COALESCE($3, sort_order)
          WHERE id::text = $1 RETURNING *`,
        [String(req.params.id), b.label ?? null, b.sort_order ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Dominio no encontrado' });
      // Descripción editable (tabla creada en ETAPE-4)
      if (b.descripcion != null) {
        await q(
          `INSERT INTO e360.dominios_descripcion (dominio_key, descripcion)
           VALUES ($1,$2)
           ON CONFLICT (dominio_key) DO UPDATE SET descripcion = EXCLUDED.descripcion`,
          [rows[0].key, b.descripcion],
        ).catch(() => {});
      }
      await log(req.admin, 'dominio_actualizado', rows[0].key);
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/competencias/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const b = req.body || {};
      const { rows } = await q(
        `UPDATE ${await tabla('competencies_360')}
            SET label = COALESCE($2, label), sort_order = COALESCE($3, sort_order)
          WHERE id::text = $1 RETURNING *`,
        [String(req.params.id), b.label ?? null, b.sort_order ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Competencia no encontrada' });
      await log(req.admin, 'competencia_actualizada', rows[0].key);
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/items/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const b = req.body || {};
      const t = await tabla('items_360');
      const { rows } = await q(
        `UPDATE ${t} SET sort_order = COALESCE($2, sort_order)
          WHERE id::text = $1 RETURNING *`,
        [String(req.params.id), b.sort_order ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Ítem no encontrado' });

      // El texto se guarda en item_texts_360, para el form_type indicado.
      if (b.texto != null) {
        const formType = String(b.form_type || 'autoevaluacion');
        await guardarTextoItem(rows[0].id, formType, String(b.texto));
        await log(req.admin, 'item_texto_actualizado', `${req.params.id} (${formType})`);
      } else if (b.peso == null) {
        await log(req.admin, 'item_actualizado', String(req.params.id));
      }

      // Ponderación propia del enunciado (tabla e360.item_ponderaciones).
      if (b.peso != null) {
        await guardarPesoItem(rows[0].id, Number(b.peso));
        await log(req.admin, 'item_ponderacion_actualizada', `${req.params.id} = ${b.peso}`);
      }

      const textos = await textosPorItem();
      const pesos = await pesosPorItem();
      res.json({
        ...rows[0],
        textos: textos.get(String(rows[0].id)) ?? {},
        ponderacion: pesos.has(String(rows[0].id)) ? pesos.get(String(rows[0].id)) : 1,
      });
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/ponderaciones/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const t = await tabla('competency_weights');
      const cols = await q(
        `SELECT column_name, data_type FROM information_schema.columns
          WHERE table_name = 'competency_weights'`,
      );
      const pesoCol = cols.rows
        .map((x) => x.column_name)
        .find((cn) => /weight|peso|ponderacion/i.test(cn));
      if (!pesoCol) return res.status(400).json({ error: 'No hay columna de peso' });
      const { rows } = await q(
        `UPDATE ${t} SET ${pesoCol} = $2 WHERE id::text = $1 RETURNING *`,
        [String(req.params.id), Number(req.body?.peso ?? 0)],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Ponderación no encontrada' });
      await log(req.admin, 'ponderacion_actualizada', String(req.params.id));
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  /* --------------------------------------- evaluados e invitaciones ------- */

  r.get('/admin/evaluados', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT cedula_directivo AS cedula,
                max(nombre_directivo) AS nombre,
                max(institucion_educativa) AS institucion,
                count(*)::int AS total_evaluadores,
                count(DISTINCT tipo_formulario)::int AS relaciones,
                max(created_at) AS ultima_respuesta
           FROM e360.encuestas_360
          WHERE cedula_directivo IS NOT NULL
          GROUP BY cedula_directivo
          ORDER BY max(created_at) DESC NULLS LAST
          LIMIT 500`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  r.get('/admin/invitaciones', requireAdmin, async (req, res) => {
    try {
      const cedula = req.query.cedula ? String(req.query.cedula) : null;
      const { rows } = await q(
        `SELECT * FROM e360.invitaciones
          WHERE ($1::text IS NULL OR evaluado_cedula = $1)
          ORDER BY created_at DESC LIMIT 500`,
        [cedula],
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  r.post('/admin/invitaciones', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const b = req.body || {};
      const cedula = String(b.evaluado_cedula || '').trim();
      if (!cedula) return res.status(400).json({ error: 'La cédula del evaluado es obligatoria' });
      const { rows } = await q(
        `INSERT INTO e360.invitaciones
           (evaluado_cedula, evaluado_nombre, evaluador_nombre, evaluador_correo,
            relacion, creada_por)
         VALUES ($1,$2,$3,$4,COALESCE($5,'docente'),$6) RETURNING *`,
        [cedula, b.evaluado_nombre ?? null, b.evaluador_nombre ?? null,
         b.evaluador_correo ?? null, b.relacion ?? null, req.admin.correo],
      );
      await log(req.admin, 'invitacion_creada', `${cedula} · ${rows[0].relacion}`);
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/invitaciones/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const { rows } = await q(
        `UPDATE e360.invitaciones SET estado = COALESCE($2, estado) WHERE id = $1 RETURNING *`,
        [req.params.id, req.body?.estado ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Invitación no encontrada' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.delete('/admin/invitaciones/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      await q(`DELETE FROM e360.invitaciones WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------------ informes / export ----- */

  r.get('/admin/informes', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT cedula_directivo, nombre_directivo, institucion_educativa,
                tipo_formulario, respuestas, created_at
           FROM e360.encuestas_360
          WHERE cedula_directivo IS NOT NULL`,
      );
      const porEvaluado = new Map();
      for (const row of rows) {
        const k = row.cedula_directivo;
        const e = porEvaluado.get(k) || {
          cedula: k, nombre: row.nombre_directivo, institucion: row.institucion_educativa,
          total_evaluadores: 0, suma: 0, n: 0, relaciones: {},
        };
        e.total_evaluadores += 1;
        const items = Array.isArray(row.respuestas?.items) ? row.respuestas.items : [];
        let s = 0, c = 0;
        for (const it of items) {
          const v = Number(it.valor);
          if (!Number.isFinite(v)) continue;
          s += v; c += 1;
        }
        e.suma += s; e.n += c;
        const rel = row.tipo_formulario || 'otro';
        const rr = e.relaciones[rel] || { suma: 0, n: 0 };
        rr.suma += s; rr.n += c;
        e.relaciones[rel] = rr;
        porEvaluado.set(k, e);
      }
      const round = (x) => Math.round(x * 100) / 100;
      res.json(
        [...porEvaluado.values()].map((e) => ({
          cedula: e.cedula,
          nombre: e.nombre,
          institucion: e.institucion,
          total_evaluadores: e.total_evaluadores,
          promedio_general: e.n ? round(e.suma / e.n) : 0,
          por_relacion: Object.fromEntries(
            Object.entries(e.relaciones).map(([k, v]) => [k, v.n ? round(v.suma / v.n) : 0]),
          ),
        })),
      );
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------ FICHAS + PERMISOS (usuario) ------- */

  /* ============ ADMIN: ENCUESTA 360 agrupada por institución ============= */

  const FASES = new Set(['inicial', 'final']);
  const faseDe = (v) => (FASES.has(String(v)) ? String(v) : 'inicial');

  // GET /admin/encuesta/instituciones?fase=&entidad=&q=
  r.get('/admin/encuesta/instituciones', requireAdmin, async (req, res) => {
    try {
      const fase = faseDe(req.query.fase);
      const { rows } = await q(
        `SELECT COALESCE(NULLIF(TRIM(e.institucion_educativa),''), 'No especificada') AS institucion,
                e.tipo_formulario,
                NULLIF(TRIM(f.entidad_territorial),'') AS entidad,
                NULLIF(TRIM(f.municipio),'')           AS municipio,
                e.created_at
           FROM e360.encuestas_360 e
           LEFT JOIN e360.fichas f ON f.numero_cedula = e.cedula_directivo
          WHERE COALESCE(e.fase,'inicial') = $1`,
        [fase],
      );
      const mapa = new Map();
      for (const row of rows) {
        const cur = mapa.get(row.institucion) || {
          institucion: row.institucion,
          entidad: null,
          municipio: null,
          total: 0,
          por_rol: {},
          ultima: null,
        };
        cur.total += 1;
        if (!cur.entidad && row.entidad) cur.entidad = row.entidad;
        if (!cur.municipio && row.municipio) cur.municipio = row.municipio;
        const rol = row.tipo_formulario || 'otro';
        cur.por_rol[rol] = (cur.por_rol[rol] || 0) + 1;
        if (!cur.ultima || row.created_at > cur.ultima) cur.ultima = row.created_at;
        mapa.set(row.institucion, cur);
      }
      const lista = [...mapa.values()]
        .sort((a, b) => a.institucion.localeCompare(b.institucion, 'es'));
      res.json({ fase, total: rows.length, instituciones: lista });
    } catch (e) { fail(res, e); }
  });

  // GET /admin/encuesta/detalle?fase=&institucion=
  r.get('/admin/encuesta/detalle', requireAdmin, async (req, res) => {
    try {
      const fase = faseDe(req.query.fase);
      const institucion = String(req.query.institucion || '').trim();
      if (!institucion) return res.status(400).json({ error: 'Falta la institución' });
      const { rows } = await q(
        `SELECT id, tipo_formulario, nombre_completo, cedula,
                nombre_directivo, cedula_directivo, email_evaluador, created_at
           FROM e360.encuestas_360
          WHERE COALESCE(NULLIF(TRIM(institucion_educativa),''),'No especificada') = $1
            AND COALESCE(fase,'inicial') = $2
          ORDER BY created_at DESC`,
        [institucion, fase],
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  // GET /admin/encuesta/recoleccion?fase= — estado de recolección por par (directivo)
  r.get('/admin/encuesta/recoleccion', requireAdmin, async (req, res) => {
    try {
      const fase = faseDe(req.query.fase);
      const pares = await q(
        `SELECT numero_cedula                             AS cedula,
                COALESCE(NULLIF(TRIM(nombres_apellidos), ''),
                         TRIM(CONCAT_WS(' ', nombres, apellidos))) AS nombre,
                NULLIF(TRIM(nombre_ie), '')               AS institucion,
                NULLIF(TRIM(entidad_territorial), '')     AS entidad,
                NULLIF(TRIM(municipio), '')               AS municipio
           FROM e360.fichas
          ORDER BY 2`,
      );
      const conteos = await q(
        `SELECT cedula_directivo, tipo_formulario, COUNT(*)::int AS n
           FROM e360.encuestas_360
          WHERE cedula_directivo IS NOT NULL AND COALESCE(fase,'inicial') = $1
          GROUP BY 1, 2`,
        [fase],
      );
      const mapa = new Map();
      for (const c of conteos.rows) {
        const cur = mapa.get(c.cedula_directivo) || {};
        cur[c.tipo_formulario || 'otro'] = c.n;
        mapa.set(c.cedula_directivo, cur);
      }
      res.json({
        fase,
        pares: pares.rows.map((p) => ({
          cedula: p.cedula,
          nombre: p.nombre,
          institucion: p.institucion,
          entidad: p.entidad,
          municipio: p.municipio,
          por_rol: mapa.get(p.cedula) || {},
        })),
      });
    } catch (e) { fail(res, e); }
  });

  // GET /admin/encuesta/informes?fase= — promedios por evaluado de una fase
  r.get('/admin/encuesta/informes', requireAdmin, async (req, res) => {
    return informesHandler(req, res);
  });

  // GET /admin/encuesta/informe-par?cedula=&fase= — datos crudos del informe 360
  r.get('/admin/encuesta/informe-par', requireAdmin, async (req, res) => {
    return informeParHandler(req, res);
  });

  // GET /e360/informe-par?cedula=&fase= — mismo informe, para el propio evaluado
  r.get('/informe-par', async (req, res) => {
    return informeParHandler(req, res);
  });

  async function informeParHandler(req, res) {
    try {
      const fase = faseDe(req.query.fase);
      const cedula = String(req.query.cedula || '').trim();
      if (!cedula) return res.status(400).json({ error: 'Falta la cédula del par' });

      const ficha = await q(
        `SELECT numero_cedula                             AS cedula,
                COALESCE(NULLIF(TRIM(nombres_apellidos), ''),
                         TRIM(CONCAT_WS(' ', nombres, apellidos))) AS nombre,
                NULLIF(TRIM(nombre_ie), '')               AS institucion,
                NULLIF(TRIM(entidad_territorial), '')     AS entidad,
                NULLIF(TRIM(municipio), '')               AS municipio,
                NULLIF(TRIM(codigo_dane), '')             AS codigo_dane,
                NULLIF(TRIM(cargo_actual), '')            AS cargo
           FROM e360.fichas
          WHERE numero_cedula = $1`,
        [cedula],
      );
      const { rows } = await q(
        `SELECT tipo_formulario, nombre_directivo, institucion_educativa, respuestas
           FROM e360.encuestas_360
          WHERE cedula_directivo = $1 AND COALESCE(fase,'inicial') = $2`,
        [cedula, fase],
      );
      const p = ficha.rows[0] || {};
      res.json({
        fase,
        par: {
          cedula,
          nombre: p.nombre || rows[0]?.nombre_directivo || cedula,
          entidad: p.entidad || '',
          municipio: p.municipio || '',
          institucion: p.institucion || rows[0]?.institucion_educativa || '',
          codigo_dane: p.codigo_dane || '',
          cargo: p.cargo || '',
        },
        respuestas: rows.map((row) => ({
          relacion: row.tipo_formulario || 'otro',
          dias_contacto: row.respuestas?.dias_contacto ?? null,
          items: Array.isArray(row.respuestas?.items) ? row.respuestas.items : [],
        })),
      });
    } catch (e) { fail(res, e); }
  }

  async function informesHandler(req, res) {
    try {
      const fase = faseDe(req.query.fase);
      const { rows } = await q(
        `SELECT cedula_directivo, nombre_directivo, institucion_educativa,
                tipo_formulario, respuestas
           FROM e360.encuestas_360
          WHERE cedula_directivo IS NOT NULL AND COALESCE(fase,'inicial') = $1`,
        [fase],
      );
      const porEvaluado = new Map();
      for (const row of rows) {
        const k = row.cedula_directivo;
        const e = porEvaluado.get(k) || {
          cedula: k, nombre: row.nombre_directivo, institucion: row.institucion_educativa,
          total_evaluadores: 0, suma: 0, n: 0, relaciones: {},
        };
        e.total_evaluadores += 1;
        const items = Array.isArray(row.respuestas?.items) ? row.respuestas.items : [];
        let s = 0, c = 0;
        for (const it of items) {
          const v = Number(it.valor);
          if (!Number.isFinite(v)) continue;
          s += v; c += 1;
        }
        e.suma += s; e.n += c;
        const rel = row.tipo_formulario || 'otro';
        const rr = e.relaciones[rel] || { suma: 0, n: 0 };
        rr.suma += s; rr.n += c;
        e.relaciones[rel] = rr;
        porEvaluado.set(k, e);
      }
      const round = (x) => Math.round(x * 100) / 100;
      res.json(
        [...porEvaluado.values()].map((e) => ({
          cedula: e.cedula,
          nombre: e.nombre,
          institucion: e.institucion,
          total_evaluadores: e.total_evaluadores,
          promedio_general: e.n ? round(e.suma / e.n) : 0,
          por_relacion: Object.fromEntries(
            Object.entries(e.relaciones).map(([k, v]) => [k, v.n ? round(v.suma / v.n) : 0]),
          ),
        })),
      );
    } catch (e) { fail(res, e); }
  }

  // Por defecto: Entrada habilitada, Salida deshabilitada.
  const PERMISOS_DEFECTO = { entrada: true, salida: false };

  async function leerPermisos(cedula) {
    // Si la tabla de permisos aún no existe, se aplican los valores por defecto.
    const { rows } = await q(
      `SELECT momento, habilitado FROM e360.permisos_encuesta WHERE cedula = $1`,
      [cedula],
    ).catch(() => ({ rows: [] }));
    const p = { ...PERMISOS_DEFECTO };
    for (const row of rows) p[row.momento] = row.habilitado === true;
    return p;
  }

  // GET /usuarios/:cedula/estado — enruta el ingreso por cédula.
  r.get('/usuarios/:cedula/estado', async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      if (!cedula) return res.status(400).json({ error: 'Cédula inválida' });

      const adm = await q(
        `SELECT correo, nombre FROM e360.admins WHERE cedula = $1 AND activo = true LIMIT 1`,
        [cedula],
      ).catch(() => ({ rows: [] }));

      const f = await q(
        `SELECT numero_cedula, nombres_apellidos, cargo_actual, genero, nombre_ie
           FROM e360.fichas WHERE numero_cedula = $1`,
        [cedula],
      );
      const ficha = f.rows[0] || null;
      const permisos = await leerPermisos(cedula);

      res.json({
        cedula,
        es_admin: adm.rows.length > 0,
        correo: adm.rows[0]?.correo ?? null,
        tiene_ficha: !!ficha,
        nombre: ficha?.nombres_apellidos ?? null,
        cargo: ficha?.cargo_actual ?? null,
        genero: ficha?.genero ?? null,
        institucion: ficha?.nombre_ie ?? null,
        permisos,
      });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------- DATOS GEOGRÁFICOS (RLT) ---- */
  // Lectura únicamente de las tablas geográficas existentes de RLT.
  r.get('/geo', async (_req, res) => {
    try {
      const [ent, mun, ins] = await Promise.all([
        q(`SELECT id, nombre FROM public.entidades_territoriales`),
        q(`SELECT id, nombre, entidad_territorial_id FROM public.municipios`),
        q(`SELECT id, nombre, municipio_id FROM public.instituciones`),
      ]);
      res.json({
        entidades: ent.rows,
        municipios: mun.rows,
        instituciones: ins.rows,
      });
    } catch (e) { fail(res, e); }
  });

  /* ---------------- ADMIN: CRUD geográfico (Configuración de fichas) ------ */

  /* --------- Instituciones con su directivo docente (desde las fichas) ---- */
  // Alimenta la encuesta 360: el evaluador busca su IE y ve el rector asociado.
  r.get('/instituciones-directivos', async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT NULLIF(TRIM(nombre_ie), '')            AS institucion,
                numero_cedula                          AS cedula,
                COALESCE(NULLIF(TRIM(nombres_apellidos), ''),
                         TRIM(CONCAT_WS(' ', nombres, apellidos))) AS nombre,
                cargo_actual                           AS cargo
           FROM e360.fichas
          WHERE NULLIF(TRIM(nombre_ie), '') IS NOT NULL
          ORDER BY 1, 3`,
      );
      const mapa = new Map();
      for (const row of rows) {
        if (!mapa.has(row.institucion)) mapa.set(row.institucion, []);
        if (row.nombre) {
          mapa.get(row.institucion).push({
            cedula: row.cedula,
            nombre: row.nombre,
            cargo: row.cargo ?? null,
          });
        }
      }
      res.json({
        instituciones: Array.from(mapa, ([institucion, directivos]) => ({
          institucion,
          directivos,
        })),
      });
    } catch (e) { fail(res, e); }
  });

  // Entidades territoriales
  r.post('/admin/geo/entidades', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
      const { rows } = await q(
        `INSERT INTO public.entidades_territoriales (nombre) VALUES ($1) RETURNING id, nombre`,
        [nombre],
      );
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/geo/entidades/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
      const { rows } = await q(
        `UPDATE public.entidades_territoriales SET nombre = $2 WHERE id = $1 RETURNING id, nombre`,
        [req.params.id, nombre],
      );
      if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.delete('/admin/geo/entidades/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      await q(`DELETE FROM public.entidades_territoriales WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // Municipios
  r.post('/admin/geo/municipios', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      const entidadId = req.body?.entidad_territorial_id;
      if (!nombre || !entidadId) {
        return res.status(400).json({ error: 'Nombre y entidad territorial requeridos' });
      }
      const { rows } = await q(
        `INSERT INTO public.municipios (nombre, entidad_territorial_id)
         VALUES ($1, $2) RETURNING id, nombre, entidad_territorial_id`,
        [nombre, entidadId],
      );
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/geo/municipios/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
      const { rows } = await q(
        `UPDATE public.municipios SET nombre = $2 WHERE id = $1
         RETURNING id, nombre, entidad_territorial_id`,
        [req.params.id, nombre],
      );
      if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.delete('/admin/geo/municipios/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      await q(`DELETE FROM public.municipios WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // Instituciones educativas
  r.post('/admin/geo/instituciones', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      const municipioId = req.body?.municipio_id;
      if (!nombre || !municipioId) {
        return res.status(400).json({ error: 'Nombre y municipio requeridos' });
      }
      const { rows } = await q(
        `INSERT INTO public.instituciones (nombre, municipio_id)
         VALUES ($1, $2) RETURNING id, nombre, municipio_id`,
        [nombre, municipioId],
      );
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/geo/instituciones/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
      const { rows } = await q(
        `UPDATE public.instituciones SET nombre = $2 WHERE id = $1
         RETURNING id, nombre, municipio_id`,
        [req.params.id, nombre],
      );
      if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.delete('/admin/geo/instituciones/:id', requireAdmin, requireEscritura, async (req, res) => {
    try {
      await q(`DELETE FROM public.instituciones WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // Importación CSV: entidad,municipio,institucion (una fila por institución)
  r.post('/admin/geo/importar', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const filas = Array.isArray(req.body?.filas) ? req.body.filas : [];
      if (filas.length === 0) return res.status(400).json({ error: 'CSV vacío' });

      let entidadesCreadas = 0, municipiosCreados = 0, institucionesCreadas = 0;

      for (const fila of filas) {
        const entidadCruda = String(fila?.entidad || '').trim();
        const entidad = canonizar(entidadCruda) || entidadCruda;
        const municipio = String(fila?.municipio || '').trim();
        const institucion = String(fila?.institucion || '').trim();
        if (!entidad) continue;
        /* Regla «una sola casa»: el municipio certificado no cuelga de su departamento. */
        if (municipio && municipioDuplicado(entidad, municipio)) continue;

        let ent = (await q(
          `SELECT id FROM public.entidades_territoriales WHERE ${NORM('nombre')} = ${NORM('$1')} LIMIT 1`,
          [entidad],
        )).rows[0];
        if (!ent) {
          ent = (await q(
            `INSERT INTO public.entidades_territoriales (nombre) VALUES ($1) RETURNING id`,
            [entidad],
          )).rows[0];
          entidadesCreadas += 1;
        }
        if (!municipio) continue;

        let mun = (await q(
          `SELECT id FROM public.municipios
            WHERE ${NORM('nombre')} = ${NORM('$1')} AND entidad_territorial_id = $2 LIMIT 1`,
          [municipio, ent.id],
        )).rows[0];
        if (!mun) {
          mun = (await q(
            `INSERT INTO public.municipios (nombre, entidad_territorial_id)
             VALUES ($1, $2) RETURNING id`,
            [municipio, ent.id],
          )).rows[0];
          municipiosCreados += 1;
        }
        if (!institucion) continue;

        const ins = (await q(
          `SELECT id FROM public.instituciones
            WHERE ${NORM('nombre')} = ${NORM('$1')} AND municipio_id = $2 LIMIT 1`,
          [institucion, mun.id],
        )).rows[0];
        if (!ins) {
          await q(
            `INSERT INTO public.instituciones (nombre, municipio_id) VALUES ($1, $2)`,
            [institucion, mun.id],
          );
          institucionesCreadas += 1;
        }
      }

      res.json({ ok: true, entidadesCreadas, municipiosCreados, institucionesCreadas });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------------------------------ */
  /* Registro nacional (DUE — datos.gov.co, dataset upkm-vdjb)          */
  /* ------------------------------------------------------------------ */

  const DUE_URL = 'https://www.datos.gov.co/resource/upkm-vdjb.json';

  const limpiar = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const titulo = (v) =>
    limpiar(v)
      .toLowerCase()
      .replace(/(^|[\s(/-])([a-záéíóúñ])/g, (_m, a, b) => a + b.toUpperCase());

  /* Comparación insensible a acentos/mayúsculas/espacios, igual que public.e360_norm en SQL.
     Evita crear "Medellín" y "Medellin" como dos filas distintas. */
  const NORM = (expr) =>
    `lower(btrim(regexp_replace(translate(coalesce(${expr},''),` +
    `'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',` +
    `'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc'), '\\s+', ' ', 'g')))`;

  const sinAcentos = (v) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  /* Entidades territoriales certificadas: 32 departamentos + Bogotá D.C. + 64 municipios. */
  const DEPARTAMENTOS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
    'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
    'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada', 'Bogotá D.C.',
  ];
  const MUNICIPIOS_CERTIFICADOS = [
    'Apartadó', 'Armenia', 'Barrancabermeja', 'Barranquilla', 'Bello', 'Bucaramanga',
    'Buenaventura', 'Buga', 'Cali', 'Cartagena', 'Cartago', 'Chía', 'Ciénaga', 'Cúcuta',
    'Dosquebradas', 'Duitama', 'Envigado', 'Facatativá', 'Florencia', 'Floridablanca',
    'Funza', 'Fusagasugá', 'Girardot', 'Girón', 'Ibagué', 'Ipiales', 'Itagüí', 'Jamundí',
    'La Estrella', 'Lorica', 'Magangué', 'Maicao', 'Malambo', 'Manizales', 'Medellín',
    'Montería', 'Mosquera', 'Neiva', 'Palmira', 'Pasto', 'Pereira', 'Piedecuesta',
    'Pitalito', 'Popayán', 'Quibdó', 'Riohacha', 'Rionegro', 'Sabaneta', 'Sahagún',
    'Santa Marta', 'Sincelejo', 'Soacha', 'Sogamoso', 'Soledad', 'Tuluá', 'Tumaco',
    'Tunja', 'Turbo', 'Uribia', 'Valledupar', 'Villavicencio', 'Yopal', 'Yumbo',
    'Zipaquirá',
  ];
  const CANONICO = new Map();
  for (const n of [...DEPARTAMENTOS, ...MUNICIPIOS_CERTIFICADOS]) CANONICO.set(sinAcentos(n), n);
  const ALIAS_ET = {
    'bogota, d.c.': 'Bogotá D.C.',
    'bogota d.c': 'Bogotá D.C.',
    'bogota dc': 'Bogotá D.C.',
    'bogota': 'Bogotá D.C.',
    'santa fe de bogota d.c.': 'Bogotá D.C.',
    'archipielago de san andres, providencia y santa catalina': 'San Andrés y Providencia',
    'archipielago de san andres': 'San Andrés y Providencia',
    'san andres': 'San Andrés y Providencia',
    'san andres, providencia y santa catalina': 'San Andrés y Providencia',
    'guadalajara de buga': 'Buga',
    'san jose de cucuta': 'Cúcuta',
    'santiago de cali': 'Cali',
    'santa marta d.t.c.h.': 'Santa Marta',
    'distrito turistico cultural e historico de santa marta': 'Santa Marta',
    'santa cruz de lorica': 'Lorica',
  };
  for (const [k, v] of Object.entries(ALIAS_ET)) CANONICO.set(k, v);
  const canonizar = (v) => CANONICO.get(sinAcentos(v)) || null;
  const ES_DEPARTAMENTO = new Set(DEPARTAMENTOS.map(sinAcentos));
  const ES_MUN_CERTIFICADO = new Set(MUNICIPIOS_CERTIFICADOS.map(sinAcentos));
  /* Regla «una sola casa»: un municipio certificado sólo vive bajo su propia
     entidad certificada, nunca bajo su departamento. */
  const municipioDuplicado = (entidad, municipio) =>
    ES_DEPARTAMENTO.has(sinAcentos(entidad)) && ES_MUN_CERTIFICADO.has(sinAcentos(municipio));

  function mapearDue(row) {
    return {
      codigo_dane: limpiar(row.codigoestablecimiento),
      nombre: titulo(row.nombreestablecimiento),
      departamento: titulo(row.nombredepartamento),
      municipio: titulo(row.nombremunicipio),
      secretaria: titulo(row.secretaria),
      zona: titulo(row.zona),
      direccion: limpiar(row.direccion),
      telefono: limpiar(row.telefono),
      correo: limpiar(row.correo_electronico),
      niveles: limpiar(row.niveles),
      jornadas: limpiar(row.jornada),
      especialidad: titulo(row.especialidad),
      modelos_educativos: titulo(row.modelos_educativos),
      numero_de_sedes: limpiar(row.numero_de_sedes),
      tipo_establecimiento: titulo(row.tipo_establecimiento),
      /* En el DUE el nombre del rector/director viene en la columna codigo_etc. */
      rector: titulo(row.codigo_etc),
      /* Registro completo tal como lo devuelve datos.gov.co (todas las columnas). */
      crudo: Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : limpiar(v),
        ]),
      ),
    };
  }

  async function consultarDue(params) {
    const url = `${DUE_URL}?${params.toString()}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
      throw new Error(`El registro nacional respondió ${resp.status}`);
    }
    const filas = await resp.json();
    return Array.isArray(filas) ? filas.map(mapearDue) : [];
  }

  const escapeSoql = (v) => String(v).replace(/'/g, "''");

  /* Sinónimos frecuentes en el DUE: los nombres pueden venir abreviados
     ("IE", "CE") o completos ("INSTITUCION EDUCATIVA"). */
  const SINONIMOS_DUE = [
    ['INSTITUCION', 'INSTITUCIÓN', 'INST', 'IE', 'I.E'],
    ['CENTRO', 'CE', 'C.E'],
    ['EDUCATIVA', 'EDUCATIVO', 'EDU'],
    ['COLEGIO', 'COL'],
  ];

  function condicionToken(token) {
    const grupo = SINONIMOS_DUE.find((g) =>
      g.some((s) => s === token || (token.length >= 3 && s.startsWith(token))),
    );
    const variantes = grupo ? grupo : [token];
    const patrones = [];
    variantes.forEach((v0) => {
      const v = escapeSoql(v0);
      if (v0.length <= 3) {
        /* Abreviaturas cortas ("IE", "CE"): solo como palabra, no como subcadena. */
        patrones.push(`upper(nombreestablecimiento) like '${v} %'`);
        patrones.push(`upper(nombreestablecimiento) like '% ${v} %'`);
        patrones.push(`upper(nombreestablecimiento) like '% ${v}'`);
        patrones.push(`upper(nombreestablecimiento) like '${v}.%'`);
      } else {
        patrones.push(`upper(nombreestablecimiento) like '%${v}%'`);
      }
    });
    return `(${patrones.join(' OR ')})`;
  }

  // GET /due/buscar?q=&municipio=&departamento=&limit=
  r.get('/due/buscar', async (req, res) => {
    try {
      const q0 = limpiar(req.query.q);
      const municipio = limpiar(req.query.municipio);
      const departamento = limpiar(req.query.departamento);
      const limit = Math.min(Number(req.query.limit) || 25, 200);
      if (q0.length < 3 && !municipio) {
        return res.json({ resultados: [] });
      }

      const where = [];
      if (q0) {
        if (/^\d+$/.test(q0)) {
          where.push(`codigoestablecimiento like '${escapeSoql(q0)}%'`);
        } else {
          /* Cada palabra (>=3 letras) debe aparecer en el nombre, con sinónimos. */
          const tokens = q0
            .toUpperCase()
            .split(/[^0-9A-ZÁÉÍÓÚÑ.]+/)
            .filter((t) => t.length >= 3);
          const usados = tokens.length > 0 ? tokens : [q0.toUpperCase()];
          usados.forEach((t) => where.push(condicionToken(t)));
        }
      }
      if (municipio) where.push(`upper(nombremunicipio) = '${escapeSoql(municipio.toUpperCase())}'`);
      if (departamento)
        where.push(`upper(nombredepartamento) = '${escapeSoql(departamento.toUpperCase())}'`);

      const params = new URLSearchParams({
        $limit: String(limit),
        $order: 'nombreestablecimiento',
      });
      if (where.length > 0) params.set('$where', where.join(' AND '));

      const resultados = await consultarDue(params);
      res.json({ resultados });
      /* Respaldo en vivo: lo encontrado se guarda en el espejo para la próxima vez. */
      for (const f of resultados) {
        try { await guardarEstablecimiento(f); } catch { /* el espejo es opcional */ }
      }
    } catch (e) { fail(res, e); }
  });

  /* ============ ESPEJO LOCAL DEL REGISTRO NACIONAL (e360.due_establecimientos)
     La autocompletación de la ficha lee de nuestra base (rápida y disponible);
     el DUE solo sirve para refrescar el espejo y como respaldo puntual. */

  const normalizar = (v) => sinAcentos(limpiar(v));

  async function guardarEstablecimiento(f) {
    const entidad = canonizar(f.secretaria) || canonizar(f.departamento) || f.departamento || '';
    if (!f.codigo_dane || !f.nombre) return null;
    const { rows } = await q(
      `INSERT INTO e360.due_establecimientos (
         codigo_dane, nombre, nombre_norm, secretaria, departamento, municipio,
         municipio_norm, entidad, entidad_norm, zona, direccion, telefono, correo,
         niveles, jornadas, especialidad, modelos, numero_de_sedes, tipo, rector,
         sincronizado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
       ON CONFLICT (codigo_dane) DO UPDATE SET
         nombre = EXCLUDED.nombre, nombre_norm = EXCLUDED.nombre_norm,
         secretaria = EXCLUDED.secretaria, departamento = EXCLUDED.departamento,
         municipio = EXCLUDED.municipio, municipio_norm = EXCLUDED.municipio_norm,
         entidad = EXCLUDED.entidad, entidad_norm = EXCLUDED.entidad_norm,
         zona = EXCLUDED.zona, direccion = EXCLUDED.direccion,
         telefono = EXCLUDED.telefono, correo = EXCLUDED.correo,
         niveles = EXCLUDED.niveles, jornadas = EXCLUDED.jornadas,
         especialidad = EXCLUDED.especialidad, modelos = EXCLUDED.modelos,
         numero_de_sedes = EXCLUDED.numero_de_sedes, tipo = EXCLUDED.tipo,
         rector = EXCLUDED.rector, sincronizado_en = now()
       RETURNING (xmax = 0) AS creado`,
      [
        f.codigo_dane, f.nombre, normalizar(f.nombre), f.secretaria, f.departamento,
        f.municipio, normalizar(f.municipio), entidad, normalizar(entidad), f.zona,
        f.direccion, f.telefono, f.correo, f.niveles, f.jornadas, f.especialidad,
        f.modelos_educativos, f.numero_de_sedes, f.tipo_establecimiento, f.rector || '',
      ],
    );
    return rows[0]?.creado === true;
  }

  const filaEspejo = (row) => ({
    codigo_dane: row.codigo_dane,
    nombre: row.nombre,
    departamento: row.departamento || '',
    municipio: row.municipio || '',
    secretaria: row.secretaria || row.entidad || '',
    zona: row.zona || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    correo: row.correo || '',
    niveles: row.niveles || '',
    jornadas: row.jornadas || '',
    especialidad: row.especialidad || '',
    modelos_educativos: row.modelos || '',
    numero_de_sedes: row.numero_de_sedes || '',
    tipo_establecimiento: row.tipo || '',
    rector: row.rector || '',
  });

  // GET /instituciones/buscar?q=&municipio=&entidad=&limit=  (espejo local)
  r.get('/instituciones/buscar', async (req, res) => {
    try {
      const q0 = limpiar(req.query.q);
      const municipio = normalizar(req.query.municipio);
      const entidad = normalizar(req.query.entidad);
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      if (q0.length < 2) return res.json({ resultados: [] });

      const where = [];
      const vals = [];
      const add = (sql, v) => { vals.push(v); where.push(sql.replace('$?', `$${vals.length}`)); };

      if (/^\d{4,}$/.test(q0)) {
        add(`codigo_dane LIKE $? || '%'`, q0);
      } else {
        const tokens = normalizar(q0).split(/[^0-9A-Z]+/).filter((t) => t.length >= 2);
        (tokens.length > 0 ? tokens : [normalizar(q0)]).forEach((t) => {
          add(`nombre_norm LIKE '%' || $? || '%'`, t);
        });
      }
      if (municipio) add(`municipio_norm = $?`, municipio);
      if (entidad) add(`entidad_norm = $?`, entidad);

      vals.push(limit);
      const { rows } = await q(
        `SELECT * FROM e360.due_establecimientos
          WHERE ${where.join(' AND ')}
          ORDER BY length(nombre), nombre
          LIMIT $${vals.length}`,
        vals,
      );
      res.json({ resultados: rows.map(filaEspejo) });
    } catch (e) { fail(res, e); }
  });

  /* Sincronización incremental del espejo: recorre el dataset completo por
     páginas y hace UPSERT por código DANE. Idempotente, nunca borra. */
  async function sincronizarEspejoDue(origen) {
    const inicio = (await q(
      `INSERT INTO e360.due_sincronizaciones (origen) VALUES ($1) RETURNING id`,
      [origen],
    )).rows[0];
    let leidos = 0, creados = 0, actualizados = 0;
    try {
      const PAGINA = 1000;
      for (let offset = 0; offset < 80000; offset += PAGINA) {
        const params = new URLSearchParams({
          $limit: String(PAGINA),
          $offset: String(offset),
          $order: 'codigoestablecimiento',
        });
        const filas = await consultarDue(params);
        if (filas.length === 0) break;
        leidos += filas.length;
        for (const f of filas) {
          const entidad = canonizar(f.secretaria) || canonizar(f.departamento);
          if (!entidad) continue; /* fuera de las 97 entidades certificadas */
          const creado = await guardarEstablecimiento(f);
          if (creado === true) creados += 1;
          else if (creado === false) actualizados += 1;
        }
        if (filas.length < PAGINA) break;
      }
      await q(
        `UPDATE e360.due_sincronizaciones
            SET terminado_en = now(), leidos = $2, creados = $3, actualizados = $4
          WHERE id = $1`,
        [inicio.id, leidos, creados, actualizados],
      );
      return { ok: true, leidos, creados, actualizados };
    } catch (e) {
      await q(
        `UPDATE e360.due_sincronizaciones
            SET terminado_en = now(), leidos = $2, creados = $3, actualizados = $4, error = $5
          WHERE id = $1`,
        [inicio.id, leidos, creados, actualizados, String(e.message || e)],
      );
      throw e;
    }
  }

  // POST /admin/due/sincronizar — manual, desde el panel de administración
  r.post('/admin/due/sincronizar', requireAdmin, requireEscritura, async (_req, res) => {
    try { res.json(await sincronizarEspejoDue('admin')); } catch (e) { fail(res, e); }
  });

  // POST /due/sincronizar-cron — automática (Render Cron Job), con secreto compartido
  r.post('/due/sincronizar-cron', async (req, res) => {
    try {
      const esperado = process.env.E360_CRON_SECRET;
      if (!esperado) return res.status(503).json({ error: 'E360_CRON_SECRET no está configurado.' });
      const enviado =
        limpiar(req.headers['x-cron-secret']) ||
        limpiar((req.headers.authorization || '').replace(/^Bearer\s+/i, '')) ||
        limpiar(req.query.secret);
      if (enviado !== limpiar(esperado)) return res.status(401).json({ error: 'No autorizado' });
      res.json(await sincronizarEspejoDue('cron'));
    } catch (e) { fail(res, e); }
  });

  // GET /admin/due/estado — última sincronización y total del espejo
  r.get('/admin/due/estado', requireAdmin, async (_req, res) => {
    try {
      const total = (await q(`SELECT count(1)::int AS n FROM e360.due_establecimientos`)).rows[0];
      const ultima = (await q(
        `SELECT * FROM e360.due_sincronizaciones ORDER BY iniciado_en DESC LIMIT 1`,
      )).rows[0] || null;
      res.json({ total: total?.n ?? 0, ultima });
    } catch (e) { fail(res, e); }
  });

  // POST /admin/geo/importar-due { departamento?, municipio?, secretaria?, limite? }
  r.post('/admin/geo/importar-due', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const b = req.body || {};
      const departamento = limpiar(b.departamento);
      const municipio = limpiar(b.municipio);
      const secretaria = limpiar(b.secretaria);
      const limite = Math.min(Number(b.limite) || 2000, 5000);
      if (!departamento && !municipio && !secretaria) {
        return res
          .status(400)
          .json({ error: 'Indica al menos un departamento, municipio o secretaría.' });
      }

      const where = [];
      if (departamento)
        where.push(`upper(nombredepartamento) = '${escapeSoql(departamento.toUpperCase())}'`);
      if (municipio) where.push(`upper(nombremunicipio) = '${escapeSoql(municipio.toUpperCase())}'`);
      if (secretaria) where.push(`upper(secretaria) = '${escapeSoql(secretaria.toUpperCase())}'`);

      const params = new URLSearchParams({
        $limit: String(limite),
        $order: 'nombreestablecimiento',
        $where: where.join(' AND '),
      });
      const filas = await consultarDue(params);

      let entidadesCreadas = 0, municipiosCreados = 0, institucionesCreadas = 0;
      const cacheEnt = new Map(), cacheMun = new Map();

      for (const f of filas) {
        const nombreEntidad =
          canonizar(f.secretaria) || canonizar(f.departamento) || f.secretaria || f.departamento;
        if (!nombreEntidad || !f.municipio || !f.nombre) continue;
        /* Regla «una sola casa»: no duplicar el municipio certificado bajo su departamento. */
        if (municipioDuplicado(nombreEntidad, f.municipio)) continue;

        let entId = cacheEnt.get(nombreEntidad.toLowerCase());
        if (!entId) {
          let ent = (await q(
            `SELECT id FROM public.entidades_territoriales WHERE ${NORM('nombre')} = ${NORM('$1')} LIMIT 1`,
            [nombreEntidad],
          )).rows[0];
          if (!ent) {
            ent = (await q(
              `INSERT INTO public.entidades_territoriales (nombre) VALUES ($1) RETURNING id`,
              [nombreEntidad],
            )).rows[0];
            entidadesCreadas += 1;
          }
          entId = ent.id;
          cacheEnt.set(nombreEntidad.toLowerCase(), entId);
        }

        const claveMun = `${entId}|${f.municipio.toLowerCase()}`;
        let munId = cacheMun.get(claveMun);
        if (!munId) {
          let mun = (await q(
            `SELECT id FROM public.municipios
              WHERE ${NORM('nombre')} = ${NORM('$1')} AND entidad_territorial_id = $2 LIMIT 1`,
            [f.municipio, entId],
          )).rows[0];
          if (!mun) {
            mun = (await q(
              `INSERT INTO public.municipios (nombre, entidad_territorial_id)
               VALUES ($1, $2) RETURNING id`,
              [f.municipio, entId],
            )).rows[0];
            municipiosCreados += 1;
          }
          munId = mun.id;
          cacheMun.set(claveMun, munId);
        }

        const ins = (await q(
          `SELECT id FROM public.instituciones
            WHERE ${NORM('nombre')} = ${NORM('$1')} AND municipio_id = $2 LIMIT 1`,
          [f.nombre, munId],
        )).rows[0];
        if (!ins) {
          await q(
            `INSERT INTO public.instituciones (nombre, municipio_id) VALUES ($1, $2)`,
            [f.nombre, munId],
          );
          institucionesCreadas += 1;
        }
      }

      res.json({
        ok: true,
        registrosConsultados: filas.length,
        entidadesCreadas,
        municipiosCreados,
        institucionesCreadas,
      });
    } catch (e) { fail(res, e); }
  });

  // GET /fichas/:cedula
  /* POST /admin/geo/sincronizar-territorio
     Trae del DUE todas las combinaciones Secretaría/Departamento + Municipio del país
     (consulta agregada, no institución por institución) y crea las que falten. */
  r.post('/admin/geo/sincronizar-territorio', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const incluirInstituciones = req.body?.incluirInstituciones !== false;
      const combinaciones = new Map(); // "entidad|municipio" -> { entidad, municipio }
      const PAGINA = 1000;
      const totalEntMun = await fetch(`${DUE_URL}?$select=count(1)`, {
        headers: { Accept: 'application/json' },
      }).then(r => r.json()).then(j => Number(j?.[0]?.count_1 || 0));
      const topeEntMun = Math.min(totalEntMun || 30000, 30000);
      for (let offset = 0; offset < topeEntMun; offset += PAGINA) {
        const params = new URLSearchParams({
          $select: 'secretaria, nombredepartamento, nombremunicipio',
          $group: 'secretaria, nombredepartamento, nombremunicipio',
          $order: 'nombredepartamento, nombremunicipio',
          $limit: String(PAGINA),
          $offset: String(offset),
        });
        const url = `${DUE_URL}?${params.toString()}`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!resp.ok) throw new Error(`El registro nacional respondió ${resp.status}`);
        const filas = await resp.json();
        if (!Array.isArray(filas) || filas.length === 0) break;
        for (const f of filas) {
          const entidad = canonizar(f.secretaria) || canonizar(f.nombredepartamento);
          const municipio = titulo(f.nombremunicipio);
          if (!entidad || !municipio) continue;
          /* Regla «una sola casa»: el municipio certificado no cuelga de su departamento. */
          if (municipioDuplicado(entidad, municipio)) continue;
          combinaciones.set(`${sinAcentos(entidad)}|${sinAcentos(municipio)}`, {
            entidad,
            municipio,
          });
        }
        if (filas.length < PAGINA) break;
      }

      let entidadesCreadas = 0, municipiosCreados = 0;
      const cacheEnt = new Map();
      const cacheMun = new Map(); // "entId|municipio" -> munId

      for (const { entidad, municipio } of combinaciones.values()) {
        let entId = cacheEnt.get(sinAcentos(entidad));
        if (!entId) {
          let ent = (await q(
            `SELECT id FROM public.entidades_territoriales WHERE ${NORM('nombre')} = ${NORM('$1')} LIMIT 1`,
            [entidad],
          )).rows[0];
          if (!ent) {
            ent = (await q(
              `INSERT INTO public.entidades_territoriales (nombre) VALUES ($1) RETURNING id`,
              [entidad],
            )).rows[0];
            entidadesCreadas += 1;
          }
          entId = ent.id;
          cacheEnt.set(sinAcentos(entidad), entId);
        }

        const clave = `${entId}|${sinAcentos(municipio)}`;
        if (cacheMun.has(clave)) continue;
        let mun = (await q(
          `SELECT id FROM public.municipios
            WHERE ${NORM('nombre')} = ${NORM('$1')} AND entidad_territorial_id = $2 LIMIT 1`,
          [municipio, entId],
        )).rows[0];
        if (!mun) {
          mun = (await q(
            `INSERT INTO public.municipios (nombre, entidad_territorial_id)
              VALUES ($1, $2) RETURNING id`,
            [municipio, entId],
          )).rows[0];
          municipiosCreados += 1;
        }
        cacheMun.set(clave, mun.id);
      }

      /* Segunda pasada: lista de instituciones de cada municipio (consulta agregada). */
      let institucionesCreadas = 0;
      let establecimientos = 0;
      let totalRegistros = totalEntMun;
      if (incluirInstituciones) {
        const vistos = new Set(); // "munId|nombre"
        const totalIns = await fetch(`${DUE_URL}?$select=count(1)`, {
          headers: { Accept: 'application/json' },
        }).then(r => r.json()).then(j => Number(j?.[0]?.count_1 || 0));
        const topeIns = Math.min(totalIns || 30000, 30000);
        totalRegistros = totalIns || totalEntMun;
        for (let offset = 0; offset < topeIns; offset += PAGINA) {
          const params = new URLSearchParams({
            $select: 'secretaria, nombredepartamento, nombremunicipio, nombreestablecimiento',
            $group: 'secretaria, nombredepartamento, nombremunicipio, nombreestablecimiento',
            $order: 'nombredepartamento, nombremunicipio, nombreestablecimiento',
            $limit: String(PAGINA),
            $offset: String(offset),
          });
          const resp = await fetch(`${DUE_URL}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
          });
          if (!resp.ok) throw new Error(`El registro nacional respondió ${resp.status}`);
          const filas = await resp.json();
          if (!Array.isArray(filas) || filas.length === 0) break;
          establecimientos += filas.length;

          for (const f of filas) {
            const entidad = canonizar(f.secretaria) || canonizar(f.nombredepartamento);
            const municipio = titulo(f.nombremunicipio);
            const nombre = titulo(f.nombreestablecimiento);
            if (!entidad || !municipio || !nombre) continue;
            if (municipioDuplicado(entidad, municipio)) continue;

            const entId = cacheEnt.get(sinAcentos(entidad));
            if (!entId) continue;
            const munId = cacheMun.get(`${entId}|${sinAcentos(municipio)}`);
            if (!munId) continue;

            const claveIns = `${munId}|${sinAcentos(nombre)}`;
            if (vistos.has(claveIns)) continue;
            vistos.add(claveIns);

            const ins = (await q(
              `SELECT id FROM public.instituciones
                WHERE ${NORM('nombre')} = ${NORM('$1')} AND municipio_id = $2 LIMIT 1`,
              [nombre, munId],
            )).rows[0];
            if (!ins) {
              await q(
                `INSERT INTO public.instituciones (nombre, municipio_id) VALUES ($1, $2)`,
                [nombre, munId],
              );
              institucionesCreadas += 1;
            }
          }
          if (filas.length < PAGINA) break;
        }
      }

      res.json({
        ok: true,
        combinaciones: combinaciones.size,
        entidadesCreadas,
        municipiosCreados,
        establecimientos,
        institucionesCreadas,
        total: totalRegistros,
      });
    } catch (e) { fail(res, e); }
  });

  // GET /fichas/:cedula
  r.get('/fichas/:cedula', async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      const { rows } = await q(`SELECT * FROM e360.fichas WHERE numero_cedula = $1`, [cedula]);
      if (!rows[0]) return res.status(404).json({ error: 'Ficha no encontrada' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------------------------ FICHA (upsert) -------- */

  const FICHA_TEXTO = [
    'nombres', 'apellidos', 'nombres_apellidos', 'genero', 'lugar_nacimiento',
    'lengua_materna', 'lengua_otra', 'celular_personal', 'codigo_pais_celular',
    'correo_personal', 'correo_institucional', 'prefiere_correo',
    'enfermedad_base', 'enfermedad_detalle', 'contacto_emergencia',
    'telefono_emergencia', 'codigo_pais_telefono_emergencia',
    'discapacidad', 'discapacidad_detalle',
    'tipo_formacion', 'titulo_pregrado', 'titulo_especializacion',
    'titulo_maestria', 'titulo_doctorado', 'otros_titulos',
    'entidad_territorial', 'municipio', 'comuna_barrio', 'nombre_ie',
    'codigo_dane', 'cargo_actual', 'tipo_vinculacion', 'estatuto', 'grado_escalafon',
    'direccion_sede_principal', 'telefono_ie', 'codigo_pais_telefono_ie', 'sitio_web',
    'zona_sede', 'grupos_etnicos', 'proyectos_transversales', 'desplazamiento',
    'tipo_bachillerato', 'modelo_pedagogico',
  ];
  const FICHA_FECHA = [
    'fecha_nacimiento', 'fecha_vinculacion_servicio',
    'fecha_nombramiento_cargo', 'fecha_nombramiento_ie',
  ];
  const FICHA_ENTERO = [
    'sedes_rural', 'sedes_urbana', 'total_sedes', 'estudiantes_jec',
    'num_docentes', 'num_coordinadores', 'num_administrativos', 'num_orientadores',
    'estudiantes_preescolar', 'estudiantes_primaria', 'estudiantes_basica_secundaria',
    'estudiantes_media', 'estudiantes_ciclo_complementario', 'estudiantes_jornada_nocturna',
  ];
  const FICHA_ARRAY = ['jornadas', 'niveles_educativos'];

  const txt = (v) => {
    const s = v == null ? '' : String(v).trim();
    return s === '' ? null : s;
  };
  const num = (v) => {
    if (v == null || v === '') return null;
    const n = parseInt(String(v).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  };
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => txt(x) !== null) : []);

  /**
   * Normaliza fechas: acepta ISO (AAAA-MM-DD[THH:MM:SSZ]) y el formato local
   * DD/MM/AAAA que escriben los usuarios. Devuelve AAAA-MM-DD o null.
   * Evita el error "date/time field value out of range" que hacía fallar
   * el guardado completo de la ficha.
   */
  const fec = (v) => {
    const s = txt(v);
    if (!s) return null;
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (m) {
      const d = String(m[1]).padStart(2, '0');
      const mes = String(m[2]).padStart(2, '0');
      if (Number(mes) >= 1 && Number(mes) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
        return `${m[3]}-${mes}-${d}`;
      }
    }
    return null;
  };

  async function upsertFicha(b, cedulaForzada) {
    const cedula = String(cedulaForzada || b.numero_cedula || b.cedula || '').replace(/\D/g, '');
    if (!cedula) return { error: 'Cédula inválida' };

    const cols = ['numero_cedula', 'acepta_datos'];
    const vals = [cedula, b.acepta_datos === true];

    for (const c of FICHA_TEXTO) { cols.push(c); vals.push(txt(b[c])); }
    for (const c of FICHA_FECHA) { cols.push(c); vals.push(fec(b[c])); }
    for (const c of FICHA_ENTERO) { cols.push(c); vals.push(num(b[c])); }
    for (const c of FICHA_ARRAY) { cols.push(c); vals.push(arr(b[c])); }

    // Compatibilidad: nombres_apellidos puede ser NOT NULL en esquemas antiguos.
    const iNombreCompleto = cols.indexOf('nombres_apellidos');
    if (iNombreCompleto >= 0 && !vals[iNombreCompleto]) {
      const completo = [txt(b.nombres), txt(b.apellidos)].filter(Boolean).join(' ').trim();
      vals[iNombreCompleto] = completo || `C.C. ${cedula}`;
    }

    const marcadores = cols.map((_, i) => `$${i + 1}`).join(',');
    const actualiza = cols
      .filter((c) => c !== 'numero_cedula')
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');

    const { rows } = await q(
      `INSERT INTO e360.fichas (${cols.join(',')})
       VALUES (${marcadores})
       ON CONFLICT (numero_cedula) DO UPDATE
          SET ${actualiza}, updated_at = now()
       RETURNING *`,
      vals,
    );
    return { row: rows[0] };
  }

  // POST /fichas — crea o actualiza la ficha (upsert por número de cédula)
  r.post('/fichas', async (req, res) => {
    try {
      const out = await upsertFicha(req.body || {});
      if (out.error) return res.status(400).json({ error: out.error });
      res.status(201).json(out.row);
    } catch (e) { fail(res, e); }
  });

  /* --------------------------- FICHAS (administración) -------------------- */

  const listaParam = (v) => {
    if (v == null) return [];
    const bruto = Array.isArray(v) ? v : String(v).split(',');
    return bruto.map((x) => String(x).trim()).filter(Boolean);
  };

  function filtrosFichas(query) {
    const where = [];
    const vals = [];
    const agregar = (col, valores) => {
      const l = listaParam(valores);
      if (l.length === 0) return;
      vals.push(l);
      where.push(`${col} = ANY($${vals.length}::text[])`);
    };
    agregar('entidad_territorial', query.entidades);
    agregar('municipio', query.municipios);
    agregar('nombre_ie', query.instituciones);

    const q0 = String(query.q || '').trim();
    if (q0) {
      vals.push(`%${q0}%`);
      const i = vals.length;
      where.push(`(
        COALESCE(nombres_apellidos,'') ILIKE $${i}
        OR COALESCE(nombre_ie,'') ILIKE $${i}
        OR COALESCE(correo_personal,'') ILIKE $${i}
        OR COALESCE(correo_institucional,'') ILIKE $${i}
        OR numero_cedula ILIKE $${i}
      )`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', vals };
  }

  // GET /admin/fichas/opciones — valores distintos para los filtros en cascada
  r.get('/admin/fichas/opciones', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT DISTINCT
                NULLIF(TRIM(entidad_territorial),'') AS entidad,
                NULLIF(TRIM(municipio),'')           AS municipio,
                NULLIF(TRIM(nombre_ie),'')           AS institucion
           FROM e360.fichas`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  // GET /admin/fichas/export — todas las filas filtradas (para CSV)
  r.get('/admin/fichas/export', requireAdmin, async (req, res) => {
    try {
      const f = filtrosFichas(req.query || {});
      const { rows } = await q(
        `SELECT * FROM e360.fichas ${f.sql} ORDER BY created_at DESC`,
        f.vals,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  // GET /admin/fichas — listado paginado
  r.get('/admin/fichas', requireAdmin, async (req, res) => {
    try {
      const pagina = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const porPagina = 20;
      const f = filtrosFichas(req.query || {});
      const { rows } = await q(
        `SELECT numero_cedula AS cedula,
                NULLIF(TRIM(nombres_apellidos),'') AS nombre,
                entidad_territorial, municipio,
                nombre_ie AS institucion, cargo_actual AS cargo, genero,
                correo_personal, created_at, updated_at,
                COUNT(*) OVER() AS total
           FROM e360.fichas ${f.sql}
          ORDER BY created_at DESC
          LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`,
        f.vals,
      );
      const total = rows[0] ? Number(rows[0].total) : 0;
      res.json({
        rows: rows.map(({ total: _t, ...resto }) => resto),
        total,
        page: pagina,
        porPagina,
      });
    } catch (e) { fail(res, e); }
  });

  // GET /admin/fichas/:cedula
  r.get('/admin/fichas/:cedula', requireAdmin, async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      const { rows } = await q(`SELECT * FROM e360.fichas WHERE numero_cedula = $1`, [cedula]);
      if (!rows[0]) return res.status(404).json({ error: 'Ficha no encontrada' });
      res.json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  // PUT /admin/fichas/:cedula — upsert administrativo
  r.put('/admin/fichas/:cedula', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      const out = await upsertFicha(req.body || {}, cedula);
      if (out.error) return res.status(400).json({ error: out.error });
      res.json(out.row);
    } catch (e) { fail(res, e); }
  });

  // POST /admin/fichas — crear ficha desde la administración
  r.post('/admin/fichas', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const out = await upsertFicha(req.body || {});
      if (out.error) return res.status(400).json({ error: out.error });
      res.status(201).json(out.row);
    } catch (e) { fail(res, e); }
  });

  // DELETE /admin/fichas/:cedula — solo superadmin
  r.delete('/admin/fichas/:cedula', requireAdmin, requireSuperadmin, async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      await q(`DELETE FROM e360.fichas WHERE numero_cedula = $1`, [cedula]);
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  /* ------------------------------- PERMISOS (administración) -------------- */

  r.get('/admin/permisos', requireAdmin, async (_req, res) => {
    try {
      const { rows } = await q(
        `SELECT f.numero_cedula AS cedula,
                NULLIF(TRIM(f.nombres_apellidos), '') AS nombre,
                f.nombre_ie AS institucion, f.cargo_actual AS cargo, f.created_at,
                COALESCE(pe.habilitado, true)  AS entrada,
                COALESCE(ps.habilitado, false) AS salida
           FROM e360.fichas f
           LEFT JOIN e360.permisos_encuesta pe
                  ON pe.cedula = f.numero_cedula AND pe.momento = 'entrada'
           LEFT JOIN e360.permisos_encuesta ps
                  ON ps.cedula = f.numero_cedula AND ps.momento = 'salida'
          ORDER BY f.created_at DESC`,
      );
      res.json(rows);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/permisos/:cedula', requireAdmin, requireEscritura, async (req, res) => {
    try {
      const cedula = String(req.params.cedula || '').replace(/\D/g, '');
      const b = req.body || {};
      for (const momento of ['entrada', 'salida']) {
        if (typeof b[momento] !== 'boolean') continue;
        await q(
          `INSERT INTO e360.permisos_encuesta (cedula, momento, habilitado, otorgado_por)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (cedula, momento) DO UPDATE
              SET habilitado = EXCLUDED.habilitado,
                  otorgado_por = EXCLUDED.otorgado_por,
                  otorgado_en = now()`,
          [cedula, momento, b[momento], req.admin?.correo ?? null],
        );
      }
      res.json({ cedula, permisos: await leerPermisos(cedula) });
    } catch (e) { fail(res, e); }
  });

  return r;
 };
