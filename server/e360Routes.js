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
          { valor: 'jefe', etiqueta: 'Jefe directo' },
          { valor: 'par', etiqueta: 'Par / colega' },
          { valor: 'colaborador', etiqueta: 'Colaborador' },
          { valor: 'cliente', etiqueta: 'Cliente interno o externo' },
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
      if (!resp.ok) throw new Error(`Resend ${resp.status}: ${await resp.text()}`);
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

      // Máximo 3 solicitudes por hora y cuenta.
      const { rows: cnt } = await q(
        `SELECT count(*)::int AS n FROM e360.admin_password_resets
          WHERE admin_id = $1 AND created_at > now() - interval '1 hour'`,
        [a.id],
      );
      if ((cnt[0]?.n ?? 0) >= 3) return res.json(neutro);

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
        `SELECT id, correo, nombre, rol, activo, ultimo_ingreso, created_at
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
      if (!correo || password.length < 8) {
        return res.status(400).json({ error: 'Correo y contraseña (mínimo 8 caracteres) requeridos' });
      }
      const { rows } = await q(
        `INSERT INTO e360.admins (correo, nombre, password_hash, rol)
         VALUES ($1,$2, crypt($3, gen_salt('bf')), COALESCE($4,'admin'))
         RETURNING id, correo, nombre, rol, activo, created_at`,
        [correo, b.nombre ?? null, password, b.rol ?? null],
      );
      await log(req.admin, 'usuario_creado', correo);
      res.status(201).json(rows[0]);
    } catch (e) { fail(res, e); }
  });

  r.put('/admin/usuarios/:id', requireAdmin, requireSuperadmin, async (req, res) => {
    try {
      const b = req.body || {};
      const { rows } = await q(
        `UPDATE e360.admins
            SET nombre = COALESCE($2, nombre),
                rol    = COALESCE($3, rol),
                activo = COALESCE($4, activo),
                password_hash = CASE WHEN $5 <> '' THEN crypt($5, gen_salt('bf'))
                                     ELSE password_hash END,
                updated_at = now()
          WHERE id = $1
        RETURNING id, correo, nombre, rol, activo, ultimo_ingreso, created_at`,
        [req.params.id, b.nombre ?? null, b.rol ?? null,
         typeof b.activo === 'boolean' ? b.activo : null, String(b.password || '')],
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

  return r;
 };
