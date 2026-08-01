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
   * Estructura completa e idéntica a RLT: dominios, competencias, ítems,
   * textos por tipo de formulario y ponderaciones por rol observador.
   * GET /api/e360app/estructura
   */

  r.get('/estructura', async (_req, res) => {
    try {
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

      // Textos agrupados por ítem: { [item_id]: { autoevaluacion: "...", ... } }
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

      res.json({
        dominios: d.rows,
        competencias: c.rows,
        items: i.rows.map((it) => ({ ...it, textos: textosPorItem[it.id] || {} })),
        item_texts: t.rows,
        ponderaciones,
      });
    } catch (e) { fail(res, e); }
  });

  return r;
};
