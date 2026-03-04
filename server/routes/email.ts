import { Router, Request, Response } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

/**
 * POST /api/email/send
 * Body: { to, subject, html?, text?, from?, reply_to? }
 * Requires admin auth.
 */
router.post("/send", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  if (!RESEND_API_KEY) {
    res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    return;
  }

  const { to, subject, html, text, from, reply_to } = req.body;

  if (!to || !subject || (!html && !text)) {
    res.status(400).json({ error: "Missing required fields: to, subject, and html or text" });
    return;
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "RLT Fichas <notificaciones@liderazgo.net.co>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to,
      }),
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", data);
      res.status(resendRes.status).json({ error: data.message || "Failed to send email", details: data });
      return;
    }

    res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error("Email send error:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
});

export default router;
