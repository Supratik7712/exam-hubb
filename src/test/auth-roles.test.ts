import { describe, expect, it } from "vitest";
import { homePathFor, type Me } from "@/lib/auth";

const me = (roles: Me["roles"], status: "active" | "pending" | "inactive" = "active"): Me => ({
  userId: "u", email: "a@b.c", roles,
  profile: { account_status: status } as Me["profile"],
});

describe("role routing", () => {
  it("sends students to the student dashboard", () => expect(homePathFor(me(["student"]))).toBe("/student"));
  it("sends approved teachers to the teacher dashboard", () => expect(homePathFor(me(["teacher"]))).toBe("/teacher"));
  it("admin wins over other roles", () => expect(homePathFor(me(["student", "admin"]))).toBe("/admin"));
  it("unapproved teacher (no role yet) waits on the pending page", () => expect(homePathFor(me([], "pending"))).toBe("/pending"));
  it("deactivated accounts cannot reach dashboards", () => expect(homePathFor(me(["student"], "inactive"))).toBe("/pending"));
});
