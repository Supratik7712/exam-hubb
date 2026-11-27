import { describe, expect, it } from "vitest";
import { awaitingTeacherApproval, homePathFor, type Me } from "@/lib/auth";

const me = (roles: Me["roles"], status: "active" | "pending" | "inactive" = "active"): Me => ({
  userId: "u", email: "a@b.c", roles,
  profile: { account_status: status, phone_verified: true } as Me["profile"],
});

describe("role routing", () => {
  it("sends students to the student dashboard", () => expect(homePathFor(me(["student"]))).toBe("/student"));
  it("sends approved teachers to the teacher dashboard", () => expect(homePathFor(me(["teacher"]))).toBe("/teacher"));
  it("admin wins over other roles", () => expect(homePathFor(me(["student", "admin"]))).toBe("/admin"));
  it("opens the selected teacher dashboard for an admin with teacher access", () => expect(homePathFor(me(["student", "teacher", "admin"]), "teacher")).toBe("/teacher"));
  it("does not grant teacher access through the sign-in selection", () => expect(homePathFor(me(["student"]), "teacher")).toBe("/teacher-access"));
  it("student-only accounts still open the student dashboard without a teacher selection", () => expect(homePathFor(me(["student"]))).toBe("/student"));
  it("treats a requested but unapproved teacher as awaiting approval", () => expect(awaitingTeacherApproval({ requested_role: "teacher", account_status: "active" }, ["student"])).toBe(true));
  it("stops treating a teacher as pending once approved", () => expect(awaitingTeacherApproval({ requested_role: "teacher", account_status: "active" }, ["student", "teacher"])).toBe(false));
  it("keeps inactive accounts blocked when selecting teacher", () => expect(homePathFor(me(["teacher", "admin"], "inactive"), "teacher")).toBe("/pending"));
  it("unapproved teacher (no role yet) waits on the pending page", () => expect(homePathFor(me([], "pending"))).toBe("/pending"));
  it("deactivated accounts cannot reach dashboards", () => expect(homePathFor(me(["student"], "inactive"))).toBe("/pending"));
  it("sends only new unverified accounts to phone verification", () => {
    const unverified = me(["student"]);
    unverified.profile = { ...unverified.profile!, phone_verified: false };
    expect(homePathFor(unverified)).toBe("/verify-phone");
  });
});
