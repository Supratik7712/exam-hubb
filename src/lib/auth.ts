import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface Me {
  userId: string;
  email: string | null;
  profile: Profile | null;
  roles: AppRole[];
}

export async function fetchMe(): Promise<Me | null> {
  // The protected layout validates the user; this read is only for UI and
  // still reads profiles and roles through authenticated database policies.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return null;
  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (profileError) throw profileError;
  if (rolesError) throw rolesError;
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    roles: (roles ?? []).map((r) => r.role),
  };
}

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: fetchMe, staleTime: 30_000 });

export function useMe() {
  return useQuery(meQuery);
}

/** Highest-privilege role the user holds, or null when they have none yet (e.g. pending teacher). */
export function primaryRole(me: Me | null): AppRole | null {
  if (!me) return null;
  if (me.roles.includes("admin")) return "admin";
  if (me.roles.includes("teacher")) return "teacher";
  if (me.roles.includes("student")) return "student";
  return null;
}

/** A teacher request awaits an admin when teacher was requested but not yet granted. */
export function awaitingTeacherApproval(profile: Pick<Profile, "requested_role" | "account_status"> | null, roles: readonly string[]): boolean {
  return profile?.requested_role === "teacher" && profile.account_status !== "inactive" && !roles.includes("teacher");
}

export function homePathFor(me: Me | null, preferredRole?: AppRole): "/admin" | "/teacher" | "/student" | "/pending" | "/teacher-access" {
  if (me?.profile?.account_status === "inactive") return "/pending";
  // Choosing Teacher without the role opens the request page; it never grants access.
  if (preferredRole === "teacher" && me?.profile?.account_status === "active" && !me.roles.includes("teacher")) return "/teacher-access";
  const r = preferredRole && me?.roles.includes(preferredRole) ? preferredRole : primaryRole(me);
  if (r === "admin") return "/admin";
  if (r === "teacher") return "/teacher";
  if (r === "student") return "/student";
  return "/pending";
}
