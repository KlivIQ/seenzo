// Minimal Hostinger Agentic Mail client (https://github.com/hostinger/mail-api, openapi.json).
// Uses fetch only, so it runs on the edge/serverless runtime. Server-side only.

import { requireEnv } from "./env";

const BASE_URL = "https://api.mail.hostinger.com";

export interface MessageRef {
  uid: number;
  folder: string;
}

export class HostingerMailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HostingerMailError";
  }
}

let cachedMailboxId: string | undefined;
let cachedSentFolder: string | undefined;

export function outreachFromAddress(): string | null {
  return process.env.OUTREACH_FROM?.trim().toLowerCase() || null;
}

export function outreachFromName(): string {
  return process.env.OUTREACH_FROM_NAME?.trim() || "Sriram";
}

export function hostingerConfigured(): boolean {
  return Boolean(process.env.HOSTINGER_MAIL_API_TOKEN && outreachFromAddress());
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("HOSTINGER_MAIL_API_TOKEN")}`,
      Accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204 || res.status === 202) return null;
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as {
        error?: string;
        code?: string;
        params?: Record<string, string[]>;
      };
      const fieldErrors = parsed.params
        ? Object.entries(parsed.params)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join("; ")
        : "";
      detail = [parsed.error, fieldErrors].filter(Boolean).join(" ") || detail;
    } catch {
      // keep raw text
    }
    if (res.status === 429) {
      throw new HostingerMailError(
        "Hostinger rate limit hit. Wait a few minutes before sending again.",
        429,
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new HostingerMailError(
        "Hostinger rejected the API token. Check HOSTINGER_MAIL_API_TOKEN and its mailbox access.",
        res.status,
      );
    }
    throw new HostingerMailError(`Hostinger error ${res.status}: ${detail}`, res.status);
  }
  return text ? (JSON.parse(text) as T) : null;
}

/** Mailbox resource ID: from HOSTINGER_MAILBOX_ID, or looked up via /me by the OUTREACH_FROM address. */
export async function getMailboxId(): Promise<string> {
  if (cachedMailboxId) return cachedMailboxId;
  const fromEnv = process.env.HOSTINGER_MAILBOX_ID?.trim();
  if (fromEnv) return (cachedMailboxId = fromEnv);

  const from = outreachFromAddress();
  if (!from) throw new Error("OUTREACH_FROM is not set");
  const me = await call<{ data: { mailboxes: { resourceId: string; address: string }[] } }>(
    "/api/v1/me",
  );
  const box = me?.data.mailboxes.find((m) => m.address.toLowerCase() === from);
  if (!box) {
    throw new Error(
      `The Hostinger API token cannot access ${from}. Give the token access to that mailbox.`,
    );
  }
  return (cachedMailboxId = box.resourceId);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: MessageRef | null;
}): Promise<void> {
  const mailbox = await getMailboxId();
  await call(`/api/v1/mailboxes/${encodeURIComponent(mailbox)}/send`, {
    method: "POST",
    body: JSON.stringify({
      to: [input.to],
      displayName: outreachFromName(),
      subject: input.subject,
      text: input.text,
      ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
    }),
  });
}

async function getSentFolder(mailbox: string): Promise<string> {
  if (cachedSentFolder) return cachedSentFolder;
  try {
    const res = await call<{ data: { path: string; name: string; specialUse: string | null }[] }>(
      `/api/v1/mailboxes/${encodeURIComponent(mailbox)}/folders`,
    );
    const folders = res?.data ?? [];
    const sent =
      folders.find((f) => f.specialUse === "\\Sent") ??
      folders.find((f) => /^sent( items| mail)?$/i.test(f.name));
    cachedSentFolder = sent?.path ?? "INBOX.Sent";
  } catch {
    cachedSentFolder = "INBOX.Sent";
  }
  return cachedSentFolder;
}

/**
 * Finds the copy of a just-sent message in the Sent folder (the send call returns no ID).
 * Matches recipient + exact subject among messages since `since`. Returns null if not found yet.
 */
export async function findSentMessage(input: {
  to: string;
  subject: string;
  since: Date;
}): Promise<MessageRef | null> {
  const mailbox = await getMailboxId();
  const folder = await getSentFolder(mailbox);
  const res = await call<{
    data: { uid: number; subject: string | null; to: { address: string }[] }[];
  }>(
    `/api/v1/mailboxes/${encodeURIComponent(mailbox)}/folders/${encodeURIComponent(folder)}/messages/search?perPage=20&sort=-uid`,
    {
      method: "POST",
      // Only `to` + `since`: subject/from/to/body are OR-combined by the API, so filter subject here.
      body: JSON.stringify({ to: input.to, since: input.since.toISOString().slice(0, 10) }),
    },
  );
  const want = input.subject.trim().toLowerCase();
  const hit = (res?.data ?? []).find(
    (m) =>
      (m.subject ?? "").trim().toLowerCase() === want &&
      m.to.some((t) => t.address.toLowerCase() === input.to.toLowerCase()),
  );
  return hit ? { uid: hit.uid, folder } : null;
}

export interface InboxMessage {
  uid: number;
  date: string;
  subject: string | null;
  from: { name: string; address: string } | null;
}

/** Recent Inbox messages (newest first) received on or after `since`. */
export async function listRecentInbox(since: Date, perPage = 50): Promise<InboxMessage[]> {
  const mailbox = await getMailboxId();
  const res = await call<{ data: InboxMessage[] }>(
    `/api/v1/mailboxes/${encodeURIComponent(mailbox)}/folders/INBOX/messages/search?perPage=${perPage}&sort=-uid`,
    { method: "POST", body: JSON.stringify({ since: since.toISOString().slice(0, 10) }) },
  );
  return res?.data ?? [];
}

/** Plain text of a message (falls back to HTML stripped of tags). */
export async function getMessageText(uid: number, folder = "INBOX"): Promise<string> {
  const mailbox = await getMailboxId();
  const res = await call<{ data: { text: string; html: string } }>(
    `/api/v1/mailboxes/${encodeURIComponent(mailbox)}/folders/${encodeURIComponent(folder)}/messages/${uid}/text`,
  );
  const text = res?.data.text?.trim();
  if (text) return text;
  return (res?.data.html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}
