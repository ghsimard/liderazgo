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

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ─── Middleware ────────────────────────────────────────
app.use(cors());
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

// ─── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
