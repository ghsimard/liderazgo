import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

/** GET /api/users — list all users with roles */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await query(`
      SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
             COALESCE(json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/users — create a new user */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }

    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: "Le mot de passe doit contenir entre 6 et 128 caractères" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Format d'email invalide" });
      return;
    }

    // Only superadmins can create superadmins
    if (role === "superadmin") {
      const callerRoles = await query<{ role: string }>(
        "SELECT role FROM user_roles WHERE user_id = $1",
        [req.user!.userId]
      );
      const isSuperAdmin = callerRoles.some((r) => r.role === "superadmin");
      if (!isSuperAdmin) {
        res.status(403).json({ error: "Seul un superadmin peut créer un autre superadmin" });
        return;
      }
    }

    // Check duplicate
    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing) {
      res.status(409).json({ error: "Un utilisateur avec cet email existe déjà" });
      return;
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);

    await queryOne(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [id, email.toLowerCase().trim(), hash]
    );

    // Assign role if specified
    const assignedRole = role || "admin";
    await queryOne(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [id, assignedRole]
    );

    res.status(201).json({ id, email: email.toLowerCase().trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/users/:id/password — reset password */
router.put("/:id/password", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { password } = req.body;

    if (!password || password.length < 6 || password.length > 128) {
      res.status(400).json({ error: "Mot de passe entre 6 et 128 caractères requis" });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await queryOne(
      "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id",
      [hash, id]
    );

    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/users/:id — delete a user */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Prevent self-deletion
    if (id === req.user!.userId) {
      res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
      return;
    }

    // Check if target is superadmin — only superadmins can delete superadmins
    const targetRoles = await query<{ role: string }>(
      "SELECT role FROM user_roles WHERE user_id = $1",
      [id]
    );
    if (targetRoles.some((r) => r.role === "superadmin")) {
      const callerRoles = await query<{ role: string }>(
        "SELECT role FROM user_roles WHERE user_id = $1",
        [req.user!.userId]
      );
      if (!callerRoles.some((r) => r.role === "superadmin")) {
        res.status(403).json({ error: "Seul un superadmin peut supprimer un autre superadmin" });
        return;
      }
    }

    await query("DELETE FROM user_roles WHERE user_id = $1", [id]);
    const user = await queryOne("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
