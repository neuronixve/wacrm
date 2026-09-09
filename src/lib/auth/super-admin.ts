import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "./account";

export const SUPER_ADMIN_EMAILS = [
  "sergiovj@gmail.com",
  ...(process.env.SUPER_ADMIN_EMAILS
    ? process.env.SUPER_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : []),
];

export async function requireSuperAdmin() {
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

  const isSuper =
    profile?.role === "superadmin" ||
    (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

  if (!isSuper) {
    throw new ForbiddenError("Superadmin privileges required");
  }

  return { user, profile };
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
