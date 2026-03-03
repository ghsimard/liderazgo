/**
 * Dual-mode email client — sends emails via Resend.
 *
 * • Express mode (VITE_API_URL set)  → POST /api/email/send
 * • Supabase mode (no VITE_API_URL)  → edge function "send-email"
 */

import { apiFetch } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  reply_to?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (USE_EXPRESS) {
    const { data, error } = await apiFetch<{ success: boolean; id?: string }>(
      "/api/email/send",
      { method: "POST", body: params as any }
    );
    if (error) return { success: false, error };
    return { success: true, id: data?.id };
  }

  // Supabase edge function mode
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: params,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}
