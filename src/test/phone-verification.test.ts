import { describe, expect, it } from "vitest";
import {
  normalizePhone,
  PHONE_CODE_LENGTH,
  PHONE_CODE_TTL_MINUTES,
  PHONE_MAX_ATTEMPTS,
  PHONE_RESEND_SECONDS,
  phoneCodeSchema,
  phoneSchema,
} from "@/lib/phone-verification-rules";

describe("first-time phone verification rules", () => {
  it("uses a 6-digit code that expires in 10 minutes", () => {
    expect(PHONE_CODE_LENGTH).toBe(6);
    expect(PHONE_CODE_TTL_MINUTES).toBe(10);
  });

  it("limits resend to once per 60 seconds and guessing to five attempts", () => {
    expect(PHONE_RESEND_SECONDS).toBe(60);
    expect(PHONE_MAX_ATTEMPTS).toBe(5);
  });

  it("normalizes common phone formatting and requires a country code", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(phoneSchema.parse("+91 98765 43210")).toBe("+919876543210");
    expect(phoneSchema.safeParse("9876543210").success).toBe(false);
  });

  it("accepts only six numeric digits as the verification code", () => {
    expect(phoneCodeSchema.safeParse("123456").success).toBe(true);
    expect(phoneCodeSchema.safeParse("12345").success).toBe(false);
    expect(phoneCodeSchema.safeParse("abcdef").success).toBe(false);
  });
});
