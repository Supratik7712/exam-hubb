import { z } from "zod";

export const PHONE_CODE_LENGTH = 6;
export const PHONE_CODE_TTL_MINUTES = 10;
export const PHONE_RESEND_SECONDS = 60;
export const PHONE_MAX_ATTEMPTS = 5;

export function normalizePhone(value: string): string {
  return value.trim().replace(/[\s()-]/g, "");
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/, "Include your country code, for example +91 98765 43210"));

export const phoneCodeSchema = z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code");
