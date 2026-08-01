/**
 * e360Routes.js — routes Express pour le frontend e360 (liderazgo360.co)
 *
 * Écrit pour les tables RÉELLES du schéma e360 de RLT :
 *   encuestas_360, v_360_dominios, v_360_competencias, v_360_items
 *
 * Aucune table n'est créée.
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

  // GET /api/e360app/reportes/:cedula
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

  /* ------------------------------- ESTRUCTURA 360 (vistas RLT) -----------
   * Estructura completa e idéntica a RLT: dominios > competencias > ítems,
   * con el texto correspondiente al tipo de formulario solicitado, las
   * escalas de respuesta y las ponderaciones por rol observador.
   *
   * GET /api/e360app/estructura?relacion=docente
   */

  // Escalas de respuesta idénticas a RLT (0 a 10)
  const ESCALA_FRECUENCIA = [
    { valor: 2.5, etiqueta: 'Nunca' },
    { valor: 5, etiqueta: 'Pocas veces' },
    { valor: 7.5, etiqueta: 'Algunas veces' },
    { valor: 10, etiqueta: 'Siempre' },
  ];
  const ESCALA_ACUERDO = [
    { valor: 2.5, etiqueta: 'Totalmente en desacuerdo' },
    { valor: 5, etiqueta: 'Algo en desacuerdo' },
    { valor: 7.5, etiqueta: 'Algo de acuerdo' },
    { valor: 10, etiqueta: 'Totalmente de acuerdo' },
  ];
  const NO_SE = { valor: 0, etiqueta: 'No sé' };

  const RELACIONES = [
    { valor: 'autoevaluacion', etiqueta: 'Autoevaluación', rol: 'autoeval' },
    { valor: 'directivo', etiqueta: 'Equipo directivo', rol: 'coor' },
    { valor: 'docente', etiqueta: 'Docentes', rol: 'doce' },
    { valor: 'administrativo', etiqueta: 'Administrativos', rol: 'admi' },
    { valor: 'acudiente', etiqueta: 'Acudientes', rol: 'acud' },
    { valor: 'estudiante', etiqueta: 'Estudiantes', rol: 'estu' },
  ];

  const baseKey = (k) => String(k || '').replace(/_\d+$/, '');

  r.get('/estructura', async (req, res) => {
    try {
      const relacion = String(req.query.relacion || 'autoevaluacion').trim();
      const esAuto = relacion === 'autoevaluacion';

      const [d, c, i, t, w] = await Promise.all([
        q(`SELECT id, key, label, sort_order
             FROM e360.v_360_dominios
            ORDER BY sort_order, label`),
        q(`SELECT id, key, label, domain_id, sort_order
             FROM e360.v_360_competencias
            ORDER BY sort_order, label`),
        q(`SELECT id, item_number, competency_key, response_type, sort_order
             FROM e360.v_360_items
            ORDER BY sort_order, item_number`),
        q(`SELECT id, item_id, form_type, text
             FROM e360.v_360_item_texts`),
        q(`SELECT competency_key, observer_role, weight
             FROM e360.v_360_ponderaciones`),
      ]);

      // Textos por ítem y tipo de formulario
      const textosPorItem = {};
      for (const row of t.rows) {
        (textosPorItem[row.item_id] || (textosPorItem[row.item_id] = {}))[row.form_type] = row.text;
      }

      // Ponderaciones: { [competency_key]: { [observer_role]: peso } }
      const ponderaciones = {};
      for (const row of w.rows) {
        (ponderaciones[row.competency_key] || (ponderaciones[row.competency_key] = {}))[row.observer_role] =
          Number(row.weight);
      }

      // Índices de competencias por key exacta y por key base
      const compPorKey = new Map();
      const compPorBase = new Map();
      for (const comp of c.rows) {
        compPorKey.set(comp.key, comp);
        if (!compPorBase.has(baseKey(comp.key))) compPorBase.set(baseKey(comp.key), comp);
      }

      // Ítems agrupados por competencia
      const itemsPorComp = new Map();
      for (const it of i.rows) {
        const comp =
          compPorKey.get(it.competency_key) || compPorBase.get(baseKey(it.competency_key));
        const ck = comp ? comp.key : it.competency_key;
        const texto =
          (textosPorItem[it.id] || {})[relacion] ??
          (textosPorItem[it.id] || {})['autoevaluacion'] ??
          null;
        const lista = itemsPorComp.get(ck) || [];
        lista.push({
          id: String(it.id),
          numero: it.item_number,
          texto,
          tipo_respuesta: it.response_type,
          competencia_id: ck,
          dominio_id: comp ? String(comp.domain_id) : null,
        });
        itemsPorComp.set(ck, lista);
      }

      // Estructura anidada: dominios > competencias > ítems
      const dominios = d.rows.map((dom) => ({
        id: String(dom.id),
        key: dom.key,
        nombre: dom.label,
        descripcion: '',
        competencias: c.rows
          .filter((comp) => String(comp.domain_id) === String(dom.id))
          .map((comp) => ({
            id: comp.key,
            key: comp.key,
            nombre: comp.label,
            items: itemsPorComp.get(comp.key) || [],
          }))
          .filter((comp) => comp.items.length > 0),
      }));

      res.json({
        relacion,
        relaciones: RELACIONES.map(({ valor, etiqueta }) => ({ valor, etiqueta })),
        // Escala por defecto (frecuencia) para compatibilidad
        escala: esAuto ? ESCALA_FRECUENCIA : [...ESCALA_FRECUENCIA, NO_SE],
        escalas: {
          frecuencia: esAuto ? ESCALA_FRECUENCIA : [...ESCALA_FRECUENCIA, NO_SE],
          acuerdo: esAuto ? ESCALA_ACUERDO : [...ESCALA_ACUERDO, NO_SE],
        },
        dominios,
        ponderaciones,
      });
    } catch (e) { fail(res, e); }
  });

  return r;
};

