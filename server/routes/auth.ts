import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { queryOne } from "../db";
import { signToken, requireAuth } from "../middleware/auth";

const router = Router();

/** POST /api/auth/login */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis" });
      return;
    }

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
    }>("SELECT id, email, password_hash FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);

    if (!user) {
      res.status(401).json({ error: "Identifiants incorrects" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Identifiants incorrects" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/auth/me — return current user info */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await queryOne<{ id: string; email: string; created_at: string }>(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [req.user!.userId]
    );

    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
