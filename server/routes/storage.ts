/**
 * Generic storage routes for file upload/download/delete.
 * Replaces Supabase Storage SDK calls.
 *
 * POST   /api/storage/:bucket/:path — upload a file
 * DELETE /api/storage/:bucket       — remove files { paths: [...] }
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireAdmin } from "../middleware/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

/** POST /api/storage/:bucket/* — upload a single file */
router.post("/:bucket/*", requireAuth, requireAdmin, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Fichier requis" });
    return;
  }
  const relativePath = `/uploads/${req.file.filename}`;
  res.json({ path: relativePath });
});

/** DELETE /api/storage/:bucket — remove files by paths */
router.delete("/:bucket", requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { paths } = req.body;
    if (!Array.isArray(paths)) {
      res.status(400).json({ error: "paths[] requis" });
      return;
    }
    for (const p of paths) {
      const filePath = path.join(process.cwd(), p);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
