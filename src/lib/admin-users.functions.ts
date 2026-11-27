import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes a user: app data (admin-checked RPC), uploaded files, then the sign-in account. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await context.supabase.from("study_materials").select("file_path").eq("teacher_id", data.userId);
    const { error } = await context.supabase.rpc("admin_purge_user", { _user_id: data.userId });
    if (error) throw new Error(error.message);
    const paths = (files ?? []).map((f) => f.file_path);
    if (paths.length) await supabaseAdmin.storage.from("study-materials").remove(paths);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authError) { console.error("deleteUser failed", authError); throw new Error("Account data removed, but the sign-in account could not be deleted. Try again."); }
    return { ok: true };
  });
