import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// ─── Resolve frontend build directory ───────────────────
// Compiled file lives at:   /opt/render/project/src/server/dist/index.js
// Vite frontend build lives at: /opt/render/project/src/dist/index.html
// So we need to go up TWO levels from __dirname (server/dist → server → repo root) then into "dist".
const FRONTEND_DIST_DIR = (() => {
  const candidates = [
    path.resolve(__dirname, "../../dist"), // production: server/dist/index.js → repo/dist
    path.resolve(__dirname, "../dist"),    // legacy fallback
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "index.html"))) return c;
  }
  console.warn(
    `[server] WARNING: no frontend index.html found. Tried: ${candidates.join(", ")}`,
  );
  return candidates[0];
})();
console.log(`[server] Serving frontend from: ${FRONTEND_DIST_DIR}`);

import { requireAuth, requireAdminOrViewer } from "./middleware/auth";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import imagesRoutes from "./routes/images";
import dbRoutes from "./routes/db";
import rpcRoutes from "./routes/rpc";
import exportRoutes from "./routes/export";
import storageRoutes from "./routes/storage";
import rubricaAnalysisRoutes from "./routes/rubrica-analysis";
import githubRoutes from "./routes/github";
import emailRoutes from "./routes/email";
import generateSectionTextRoutes from "./routes/generate-section-text";

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
app.use(express.static(FRONTEND_DIST_DIR));

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
app.use("/api/email", emailRoutes);
app.use("/api/generate-section-text", generateSectionTextRoutes);

// ─── Public form submission (no auth required) ───────
import { query as dbQuery } from "./db";
app.post("/api/encuestas", async (req, res) => {
  try {
    const d = req.body;
    const result = await dbQuery(
      `INSERT INTO encuestas_360 (tipo_formulario, institucion_educativa, cargo_directivo, nombre_directivo, cedula_directivo, dias_contacto, nombre_completo, cedula, grado_estudiante, cargo_evaluador, respuestas, fase, email_evaluador)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
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
        d.fase || "inicial",
        d.email_evaluador || null,
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

// ─── User permissions (RBAC) ──────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get("/api/user-permissions/:userId", requireAuth, requireAdminOrViewer, async (req, res) => {
  const userId = req.params.userId as string;
  if (!UUID_RE.test(userId)) {
    res.status(400).json({ error: "Invalid userId format" });
    return;
  }
  try {
    const rows = await dbQuery(
      `SELECT rp.section,
              bool_or(rp.can_create) as can_create,
              bool_or(rp.can_read)   as can_read,
              bool_or(rp.can_update) as can_update,
              bool_or(rp.can_delete) as can_delete
       FROM user_custom_roles ucr
       JOIN role_permissions rp ON rp.role_id = ucr.role_id
       WHERE ucr.user_id = $1
       GROUP BY rp.section`,
      [userId]
    );
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
  const indexPath = path.join(FRONTEND_DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[server] Frontend index.html missing at ${indexPath}`);
    res.status(500).send("Frontend build not found on server.");
    return;
  }
  res.sendFile(indexPath);
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

// ─── Ensure satisfaccion report tables exist (Render self-healing) ───
async function ensureSatisfaccionSchema() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS public.satisfaccion_form_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_type TEXT NOT NULL,
      definition JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by UUID,
      CONSTRAINT satisfaccion_form_definitions_form_type_key UNIQUE (form_type)
    );

    CREATE TABLE IF NOT EXISTS public.satisfaccion_report_content (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_type TEXT NOT NULL,
      module_number INTEGER NOT NULL,
      region TEXT NOT NULL,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      extra_logos TEXT[] DEFAULT '{}'::text[],
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by UUID,
      CONSTRAINT satisfaccion_report_content_unique UNIQUE (form_type, module_number, region)
    );

    CREATE INDEX IF NOT EXISTS idx_satisfaccion_report_content_lookup
      ON public.satisfaccion_report_content(form_type, module_number, region);
  `);
}

// ─── Start ────────────────────────────────────────────
(async () => {
  try {
    await ensureGeographySchema();
    await ensureSatisfaccionSchema();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize server schema:", err);
    process.exit(1);
  }
})();
