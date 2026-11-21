import { describe, expect, it } from "vitest";
import { leaveExam } from "../lib/leave-exam";

describe("leaving an exam", () => {
  it("ends the attempt before exiting instead of keeping it in progress", async () => {
    let status = "in_progress";
    let saved = false;
    let exited = false;
    await leaveExam(async () => { saved = true; }, async () => {
      expect(saved).toBe(true);
      status = "submitted";
    }, async () => {
      expect(status).toBe("submitted");
      exited = true;
    });
    expect(exited).toBe(true);
  });

  it("does not exit if the attempt cannot be ended", async () => {
    let exited = false;
    await expect(leaveExam(async () => {}, async () => { throw new Error("Unavailable"); }, async () => { exited = true; })).rejects.toThrow("Unavailable");
    expect(exited).toBe(false);
  });
});