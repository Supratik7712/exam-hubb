import { beforeEach, describe, expect, it } from "vitest";
import { saveSignInRole, takeSignInRole } from "@/lib/signin-intent";
import { homePathFor, type Me } from "@/lib/auth";

const owner: Me = { userId: "owner", email: null, roles: ["student", "teacher", "admin"], profile: null };

describe("sign-in return destination", () => {
  beforeEach(() => sessionStorage.clear());
  it("preserves teacher selection across a provider return", () => {
    saveSignInRole("teacher");
    expect(homePathFor(owner, takeSignInRole())).toBe("/teacher");
  });
  it("does not default a returning administrator to student", () => {
    expect(homePathFor(owner, takeSignInRole())).toBe("/admin");
  });
  it("consumes the selection so it cannot affect another sign-in", () => {
    saveSignInRole("teacher");
    expect(takeSignInRole()).toBe("teacher");
    expect(takeSignInRole()).toBeUndefined();
  });
  it("cannot grant teacher access to a student through stored intent", () => {
    saveSignInRole("teacher");
    expect(homePathFor({ ...owner, roles: ["student"] }, takeSignInRole())).toBe("/student");
  });
});