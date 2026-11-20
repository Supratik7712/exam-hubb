import { describe, expect, it } from "vitest";
import { secondsLeft, percentOf, passed, formatClock } from "@/lib/attempt-rules";

describe("attempt rules", () => {
  it("counts down from the server deadline, not the device clock", () => {
    // device clock is 60s ahead of server
    const loadedAt = Date.parse("2026-01-01T10:01:00Z");
    expect(secondsLeft("2026-01-01T10:30:00Z", "2026-01-01T10:00:00Z", loadedAt, loadedAt)).toBe(1800);
  });
  it("never goes below zero after the deadline", () => {
    const t = Date.parse("2026-01-01T11:00:00Z");
    expect(secondsLeft("2026-01-01T10:30:00Z", "2026-01-01T11:00:00Z", t, t)).toBe(0);
  });
  it("passes at 40% and fails below", () => {
    expect(passed(8, 20)).toBe(true);
    expect(passed(7.9, 20)).toBe(false);
    expect(percentOf(17, 21)).toBe(81);
  });
  it("formats the timer", () => { expect(formatClock(3725)).toBe("1:02:05"); expect(formatClock(65)).toBe("01:05"); });
});
