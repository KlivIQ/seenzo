import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { getSupabasePublic } from "@/lib/supabase";

const SESSION_COOKIE = "seenzo_admin_token";

export interface AdminSession {
  userId: string;
  email: string;
}

function parseCookieHeader(header: string, name: string): string | null {
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function readSessionToken(request?: Request): string | null {
  try {
    const ambient = getCookie(SESSION_COOKIE);
    if (ambient) return ambient;
  } catch {
    // No ambient request context (e.g. called outside a TanStack Start handler) — fall through.
  }
  const header = request?.headers.get("cookie");
  return header ? parseCookieHeader(header, SESSION_COOKIE) : null;
}

/**
 * Reads the admin session cookie and validates it against Supabase Auth.
 * Returns null if there's no cookie or the token is invalid/expired.
 */
export async function getAdminSession(request?: Request): Promise<AdminSession | null> {
  const token = readSessionToken(request);
  if (!token) return null;

  const { data, error } = await getSupabasePublic().auth.getUser(token);
  if (error || !data.user) return null;

  return { userId: data.user.id, email: data.user.email ?? "" };
}

export type SignInResult = { success: true } | { success: false; error: string };

/** Single admin user only — authenticates against Supabase Auth, no signup flow. */
export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await getSupabasePublic().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { success: false, error: "Invalid credentials" };
  }

  setCookie(SESSION_COOKIE, data.session.access_token, {
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });

  return { success: true };
}

export function clearAdminSession(): void {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}
