import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import imagesRoutes from "./routes/images";
import dbRoutes from "./routes/db";
import rpcRoutes from "./routes/rpc";
import exportRoutes from "./routes/export";
import storageRoutes from "./routes/storage";
import rubricaAnalysisRoutes from "./routes/rubrica-analysis";
import githubRoutes from "./routes/github";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ─── Middleware ────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));

// Serve uploaded images as static files
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

// Serve the React frontend (after build)
app.use(express.static(path.resolve(__dirname, "../dist")));

// ─── API Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/rpc", rpcRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/rubrica-analysis", rubricaAnalysisRoutes);
app.use("/api/github", githubRoutes);

// ─── Public form submission (no auth required) ───────
import { query as dbQuery } from "./db";
app.post("/api/encuestas", async (req, res) => {
  try {
    const d = req.body;
    const result = await dbQuery(
      `INSERT INTO encuestas_360 (tipo_formulario, institucion_educativa, cargo_directivo, nombre_directivo, cedula_directivo, dias_contacto, nombre_completo, cedula, grado_estudiante, cargo_evaluador, respuestas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        d.tipo_formulario,
        d.institucion_educativa,
        d.cargo_directivo,
        d.nombre_directivo || null,
        d.cedula_directivo || null,
        d.dias_contacto || null,
        d.nombre_completo || null,
        d.cedula || null,
        d.grado_estudiante || null,
        d.cargo_evaluador || null,
        JSON.stringify(d.respuestas || {}),
      ],
    );
    res.json(result[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Public geography (no auth required) ──────────────
app.get("/api/geography/instituciones", async (_req, res) => {
  try {
    const rows = await dbQuery(`SELECT id, nombre FROM instituciones ORDER BY nombre`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

// ─── Ensure required geography junction tables exist (Render self-healing) ───
async function ensureGeographySchema() {
  // Create region_entidades if missing
  await dbQuery(`
    DO $$
    BEGIN
      IF to_regclass('public.regiones') IS NOT NULL
         AND to_regclass('public.entidades_territoriales') IS NOT NULL THEN
        CREATE TABLE IF NOT EXISTS public.region_entidades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          region_id UUID NOT NULL REFERENCES public.regiones(id) ON DELETE CASCADE,
          entidad_territorial_id UUID NOT NULL REFERENCES public.entidades_territoriales(id) ON DELETE CASCADE,
          UNIQUE (region_id, entidad_territorial_id)
        );

        CREATE INDEX IF NOT EXISTS idx_region_entidades_region_id
          ON public.region_entidades(region_id);
        CREATE INDEX IF NOT EXISTS idx_region_entidades_entidad_id
          ON public.region_entidades(entidad_territorial_id);
      END IF;
    END $$;
  `);

  // Backfill links from existing municipios->entidades when possible
  await dbQuery(`
    DO $$
    BEGIN
      IF to_regclass('public.region_entidades') IS NOT NULL
         AND to_regclass('public.region_municipios') IS NOT NULL
         AND to_regclass('public.municipios') IS NOT NULL THEN
        INSERT INTO public.region_entidades (region_id, entidad_territorial_id)
        SELECT DISTINCT rm.region_id, m.entidad_territorial_id
        FROM public.region_municipios rm
        JOIN public.municipios m ON m.id = rm.municipio_id
        LEFT JOIN public.region_entidades re
          ON re.region_id = rm.region_id
         AND re.entidad_territorial_id = m.entidad_territorial_id
        WHERE re.id IS NULL;
      END IF;
    END $$;
  `);
}

// ─── Start ────────────────────────────────────────────
(async () => {
  try {
    await ensureGeographySchema();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize geography schema:", err);
    process.exit(1);
  }
})();
