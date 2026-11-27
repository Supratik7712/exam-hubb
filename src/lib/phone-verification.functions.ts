import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { phoneCodeSchema, phoneSchema } from "./phone-verification-rules";

type Challenge = { id: string; resend_at: string; expires_at: string };

async function hashPhoneCode(code: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newPhoneCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0];
  if (value === undefined) throw new Error("Could not create a verification code");
  return String(value % 1_000_000).padStart(6, "0");
}

export const sendPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: phoneSchema }))
  .handler(async ({ data, context }) => {
    const pepper = process.env["PHONE_OTP_PEPPER"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_TEXTBEE_API_KEY"];
    if (!pepper || !lovableKey || !connectionKey) throw new Error("SMS verification is not configured yet");

    const code = newPhoneCode();
    const codeHash = await hashPhoneCode(code, pepper);
    const { data: challenge, error } = await context.supabase.rpc("create_phone_challenge", {
      _phone: data.phone,
      _code_hash: codeHash,
    });
    if (error) throw new Error(error.message);
    const created = challenge as unknown as Challenge;

    const response = await fetch("https://connector-gateway.lovable.dev/udc_textbee/api/v1/gateway/send-sms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [data.phone],
        message: `Your ExamHubb verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
      }),
    });

    if (!response.ok) {
      const providerError = await response.text();
      console.error(`Textbee SMS failed [${response.status}]: ${providerError}`);
      await context.supabase.rpc("discard_phone_challenge", { _challenge_id: created.id });
      throw new Error(`Textbee could not send the code [${response.status}]: ${providerError}`);
    }

    return { phone: data.phone, resendAt: created.resend_at, expiresAt: created.expires_at };
  });

export const verifyPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: phoneCodeSchema }))
  .handler(async ({ data, context }) => {
    const pepper = process.env["PHONE_OTP_PEPPER"];
    if (!pepper) throw new Error("SMS verification is not configured yet");
    const { error } = await context.supabase.rpc("verify_phone_code", {
      _code_hash: await hashPhoneCode(data.code, pepper),
    });
    if (error) throw new Error(error.message);
    return { verified: true as const };
  });
