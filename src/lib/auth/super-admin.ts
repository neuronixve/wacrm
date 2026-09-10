import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "./account";

export const SUPER_ADMIN_EMAILS = [
  "sergiovj@gmail.com",
  ...(process.env.SUPER_ADMIN_EMAILS
    ? process.env.SUPER_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : []),
];

/**
 * Validates caller is either Super Admin or Support Staff.
 * Support users handle sales, onboardings, and day-to-day operations.
 */
export async function requireSaasAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAuthorized =
    profile?.role === "superadmin" ||
    profile?.role === "support" ||
    (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

  if (!isAuthorized) {
    throw new ForbiddenError("Se requieren permisos de Superadmin o Soporte.");
  }

  return { user, profile };
}

export const requireSuperAdmin = requireSaasAdmin;

export function canAccessSaasClients(
  profile?: { role?: string | null } | null,
  email?: string | null
): boolean {
  if (profile?.role === "superadmin" || profile?.role === "support") return true;
  if (email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  return false;
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
