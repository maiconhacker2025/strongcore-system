import { createServerFn } from "@tanstack/react-start";

const ACCESS_EMAIL = "acesso@progredir.local";
const ACCESS_PASSWORD = "@adm2026";

// Ensures the single shared access account exists with the canonical password.
// Safe to call from the login screen — it only touches one fixed account.
export const ensureAccessAccount = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find existing user by email
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);

    const existing = list.users.find((u) => u.email === ACCESS_EMAIL);

    const grantRoles = async (userId: string) => {
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          [
            { user_id: userId, role: "admin" as const },
            { user_id: userId, role: "staff" as const },
          ],
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
    };

    if (existing) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: ACCESS_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      await grantRoles(existing.id);
      return { ok: true, action: "updated" as const };
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: ACCESS_EMAIL,
      password: ACCESS_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (created?.user) await grantRoles(created.user.id);
    return { ok: true, action: "created" as const };
  },
);
