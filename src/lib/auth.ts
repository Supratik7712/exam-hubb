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
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
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

export function homePathFor(me: Me | null): "/admin" | "/teacher" | "/student" | "/pending" {
  if (me?.profile?.account_status === "inactive") return "/pending";
  const r = primaryRole(me);
  if (r === "admin") return "/admin";
  if (r === "teacher") return "/teacher";
  if (r === "student") return "/student";
  return "/pending";
}
