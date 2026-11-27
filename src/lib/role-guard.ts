import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { meQuery, homePathFor, type AppRole } from "./auth";

export async function requirePhoneVerified(queryClient: QueryClient) {
  const me = await queryClient.ensureQueryData(meQuery);
  if (!me) throw redirect({ to: "/auth" });
  return me;
}

/** Client-side route guard. Real authorization is enforced by database policies. */
export async function requireRole(queryClient: QueryClient, role: AppRole) {
  const me = await requirePhoneVerified(queryClient);
  if (me.profile?.account_status !== "active" || !me.roles.includes(role)) {
    throw redirect({ to: homePathFor(me, role) });
  }
  return { me };
}
