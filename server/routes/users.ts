import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

/** Helper: get custom role names for a user */
async function getUserRoleNames(userId: string): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT cr.name FROM user_custom_roles ucr
     JOIN custom_roles cr ON cr.id = ucr.role_id
     WHERE ucr.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.name);
}

/** Helper: get custom_role id by name */
async function getRoleIdByName(name: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM custom_roles WHERE name = $1",
    [name]
  );
  return row?.id ?? null;
}

/** Helper: map legacy role string to custom_role name */
function legacyToCustomRoleName(role: string): string {
  if (role === "superadmin") return "Superadmin";
  if (role === "monitoreo") return "Monitoreo";
  return "Admin";
}

/** Helper: map custom_role name to legacy role string */
function customToLegacyRole(name: string): string {
  if (name === "Superadmin") return "superadmin";
  if (name === "Monitoreo") return "monitoreo";
  return "admin";
}

/** GET /api/users — list all users with roles */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await query(`
      SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
             COALESCE(json_agg(cr.name) FILTER (WHERE cr.name IS NOT NULL), '[]') AS roles,
             ac.cedula
      FROM users u
      LEFT JOIN user_custom_roles ucr ON ucr.user_id = u.id
      LEFT JOIN custom_roles cr ON cr.id = ucr.role_id
      LEFT JOIN admin_cedulas ac ON ac.user_id = u.id
      GROUP BY u.id, ac.cedula
      ORDER BY u.created_at DESC
    `);
    // Map custom role names to legacy role keys for API compatibility
    const mapped = users.map((u: any) => ({
      ...u,
      roles: (u.roles || []).map((n: string) => customToLegacyRole(n)),
    }));
    res.json({ users: mapped });
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
      const callerRoles = await getUserRoleNames(req.user!.userId);
      if (!callerRoles.includes("Superadmin")) {
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

    const assignedRole = role || "admin";

    // Write to new user_custom_roles
    const customRoleName = legacyToCustomRoleName(assignedRole);
    const roleId = await getRoleIdByName(customRoleName);
    if (roleId) {
      await queryOne(
        "INSERT INTO user_custom_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, roleId]
      );
    }

    res.status(201).json({ id, email: email.toLowerCase().trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/users/:id/cedula — get cedula for a user */
router.get("/:id/cedula", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const row = await queryOne<{ cedula: string }>(
      "SELECT cedula FROM admin_cedulas WHERE user_id = $1",
      [id]
    );
    res.json({ cedula: row?.cedula || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/users/:id — update user (email, role, cedula) */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, role, cedula } = req.body;

    const callerRoles = await getUserRoleNames(req.user!.userId);
    const callerIsSuperAdmin = callerRoles.includes("Superadmin");

    const targetRoles = await getUserRoleNames(id);
    const targetIsSuperAdmin = targetRoles.includes("Superadmin");

    if (targetIsSuperAdmin && !callerIsSuperAdmin) {
      res.status(403).json({ error: "Seul un superadmin peut modifier un autre superadmin" });
      return;
    }

    if (role === "superadmin" && !callerIsSuperAdmin) {
      res.status(403).json({ error: "Seul un superadmin peut attribuer le rôle superadmin" });
      return;
    }

    // Update email
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "Format d'email invalide" });
        return;
      }
      await queryOne("UPDATE users SET email = $1 WHERE id = $2", [email.toLowerCase().trim(), id]);
    }

    // Update role
    if (req.body.custom_role_id) {
      // Direct custom role ID provided — use it
      await query("DELETE FROM user_custom_roles WHERE user_id = $1", [id]);
      await queryOne(
        "INSERT INTO user_custom_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, req.body.custom_role_id]
      );
    } else if (role) {
      // Legacy role string — map to custom role
      await query("DELETE FROM user_custom_roles WHERE user_id = $1", [id]);
      const customRoleName = legacyToCustomRoleName(role);
      const roleId = await getRoleIdByName(customRoleName);
      if (roleId) {
        await queryOne(
          "INSERT INTO user_custom_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, roleId]
        );
      }
    }

    // Update cedula
    if (cedula !== undefined) {
      if (cedula) {
        await queryOne(
          `INSERT INTO admin_cedulas (user_id, cedula) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET cedula = $2`,
          [id, cedula]
        );
      } else {
        await query("DELETE FROM admin_cedulas WHERE user_id = $1", [id]);
      }
    }

    res.json({ success: true });
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

    if (id === req.user!.userId) {
      res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
      return;
    }

    const targetRoles = await getUserRoleNames(id);
    if (targetRoles.includes("Superadmin")) {
      const callerRoles = await getUserRoleNames(req.user!.userId);
      if (!callerRoles.includes("Superadmin")) {
        res.status(403).json({ error: "Seul un superadmin peut supprimer un autre superadmin" });
        return;
      }
    }

    // Delete from RBAC table
    await query("DELETE FROM user_custom_roles WHERE user_id = $1", [id]);
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
