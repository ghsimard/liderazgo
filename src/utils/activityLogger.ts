/**
 * User activity logger — logs actions to user_activity_log table.
 *
 * Actions are fire-and-forget (no blocking, no error propagation).
 */

import { supabase } from "@/utils/dbClient";

export type ActivityAction =
  | "login"           // Cedula identification on landing
  | "page_view"       // Page access
  | "ficha_submit"    // Ficha RLT submission
  | "ficha_update"    // Ficha RLT update (edit mode)
  | "ficha_view"      // Ficha consultation (read-only)
  | "encuesta_submit" // Encuesta 360 submission
  | "rubrica_access"  // Rubrica evaluation page access
  | "rubrica_submit"  // Rubrica module submission
  | "contact_submit"  // Contact / suggestion form submission
  | "review_submit"   // Site review submission
  | "logout";         // Session end / navigate away

export function logActivity(
  cedula: string,
  actionType: ActivityAction,
  detail?: string,
  pagePath?: string
) {
  if (!cedula) return;

  const entry = {
    cedula,
    action_type: actionType,
    action_detail: detail || null,
    page_path: pagePath || window.location.pathname,
    user_agent: navigator.userAgent?.substring(0, 255) || null,
  };

  // Fire-and-forget
  supabase
    .from("user_activity_log")
    .insert(entry)
    .then(() => {})
    .catch(() => {});
}
