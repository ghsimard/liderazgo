import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query, queryOne } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Use the image_key as filename (e.g. logo_rlt.png)
    const ext = path.extname(file.originalname) || ".png";
    const key = (_req as any).params.imageKey || "upload";
    cb(null, `${key}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format d'image non supporté (PNG, JPG, WebP, SVG uniquement)"));
    }
  },
});

const router = Router();

/** GET /api/images — list all image mappings */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const images = await query("SELECT image_key, storage_path, updated_at FROM app_images ORDER BY image_key");
    res.json({ images });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/images/:imageKey — upload/replace an image (admin only) */
router.post(
  "/:imageKey",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { imageKey } = req.params;
      if (!req.file) {
        res.status(400).json({ error: "Fichier requis" });
        return;
      }

      // Build the relative path that the frontend will use
      const relativePath = `/uploads/${req.file.filename}`;

      await queryOne(
        `INSERT INTO app_images (image_key, storage_path, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (image_key) DO UPDATE SET storage_path = $2, updated_at = NOW()`,
        [imageKey, relativePath]
      );

      res.json({ image_key: imageKey, storage_path: relativePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/** DELETE /api/images/:imageKey — reset to default (admin only) */
router.delete("/:imageKey", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { imageKey } = req.params;

    // Get current file to delete from disk
    const existing = await queryOne<{ storage_path: string }>(
      "SELECT storage_path FROM app_images WHERE image_key = $1",
      [imageKey]
    );

    if (existing) {
      const filePath = path.join(process.cwd(), existing.storage_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await queryOne("DELETE FROM app_images WHERE image_key = $1", [imageKey]);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
