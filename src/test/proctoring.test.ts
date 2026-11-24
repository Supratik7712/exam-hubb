import { describe, it, expect } from "vitest";
import { outcomeFor, MAX_WARNINGS } from "@/lib/proctoring";
describe("tab switch rule", () => {
  it("gives 3 warnings", () => { expect(MAX_WARNINGS).toBe(3); expect(outcomeFor(3)).toBe("warning"); });
  it("cancels on the 4th switch", () => { expect(outcomeFor(4)).toBe("cancelled"); });
});
