import { Resend } from "resend";

import { requireEnv } from "./env";

let client: Resend | undefined;

export function getResend(): Resend {
  if (!client) {
    client = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return client;
}
