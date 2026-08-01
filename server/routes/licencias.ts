/**
 * Licences Encuesta 360 (schéma `e360`).
 *
 * GET /api/licencias/verificar/:cedula
 *   → { activa: boolean, tipo_licencia, estado, fecha_expiracion, es_administrador }
 *
 * POST /api/licencias/expirar   (admin)
 *   → passe les licences échues à "expirada" et journalise l'opération
 */

import { Router, Request, Response } from "express";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/verificar/:cedula", async (req: Request, res: Response) => {
  try {
    const cedula = String(req.params.cedula || "").trim();
    if (!cedula) {
      res.status(400).json({ error: "Cédula requerida" });
      return;
    }

    // Expiration paresseuse : une licence échue ne doit jamais passer pour active
    await query(`SELECT e360.fn_expirar_licencias()`);

    const rows = await query<any>(
      `SELECT id, cedula, nombres_apellidos, correo, tipo_licencia, estado, fecha_expiracion
         FROM e360.licencias
        WHERE cedula = $1
          AND estado = 'activa'`,
      [cedula],
    );

    const esAdministrador = rows.some((r: any) => r.tipo_licencia === "administrador");

    res.json({
      activa: rows.length > 0,
      es_administrador: esAdministrador,
      licencias: rows,
    });
  } catch (err: any) {
    console.error("[licencias] verificar failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/expirar", requireAuth, async (_req: Request, res: Response) => {
  try {
    const row = await queryOne<any>(`SELECT e360.fn_expirar_licencias() AS total`);
    res.json({ expiradas: row?.total ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
