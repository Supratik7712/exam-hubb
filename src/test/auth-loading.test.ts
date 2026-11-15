import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.getSession, getUser: mocks.getUser }, from: mocks.from } }));
import { fetchMe } from "@/lib/auth";

describe("account loading", () => {
  beforeEach(() => vi.resetAllMocks());
  it("loads database roles without repeating the layout's remote user check", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "owner", email: "owner@example.com" } } }, error: null });
    mocks.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => table === "profiles" ? { maybeSingle: async () => ({ data: { account_status: "active" }, error: null }) } : Promise.resolve({ data: [{ role: "student" }, { role: "admin" }], error: null }) }) }));
    expect((await fetchMe())?.roles).toEqual(["student", "admin"]);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
  });
  it("does not query protected data when signed out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await fetchMe()).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("surfaces session failures rather than displaying an empty account", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error("Session unavailable") });
    await expect(fetchMe()).rejects.toThrow("Session unavailable");
  });
});