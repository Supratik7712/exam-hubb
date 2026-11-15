import type { AppRole } from "./auth";

const KEY = "examhub-signin-role";

export function saveSignInRole(role?: AppRole) {
  if (role) sessionStorage.setItem(KEY, role);
  else sessionStorage.removeItem(KEY);
}

export function takeSignInRole(): AppRole | undefined {
  const role = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return role === "teacher" || role === "admin" || role === "student" ? role : undefined;
}