import { AuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

import {
  CREDENTIALS_REJECTED,
  NETWORK_FAILURE,
  validateCredentials,
} from "@/src/auth/credentials";
import { claimAnonymousFavorites } from "@/src/db/queries";
import { getSessionEmail, getSupabase } from "@/src/supabase/client";
import { syncAll } from "@/src/sync/sync";

export type AccountResult = { ok: true } | { ok: false; message: string };

function authFailureMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return NETWORK_FAILURE;
  }
  if (error instanceof AuthError && error.status !== undefined && error.status >= 500) {
    return NETWORK_FAILURE;
  }
  if (error instanceof AuthError && error.status !== undefined && error.status > 0) {
    return CREDENTIALS_REJECTED;
  }
  return NETWORK_FAILURE;
}

async function openSession(
  mode: "sign-in" | "sign-up",
  email: string,
  password: string,
): Promise<AccountResult> {
  const invalid = validateCredentials(email, password);
  if (invalid) {
    return { ok: false, message: invalid };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: NETWORK_FAILURE };
  }

  const trimmedEmail = email.trim();
  try {
    const response =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({ email: trimmedEmail, password });
    if (response.error) {
      return { ok: false, message: authFailureMessage(response.error) };
    }
    if (!response.data.session) {
      return { ok: false, message: CREDENTIALS_REJECTED };
    }
    const userId = response.data.session.user.id;
    claimAnonymousFavorites(userId);
    await syncAll(userId);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: authFailureMessage(error) };
  }
}

export function signIn(email: string, password: string): Promise<AccountResult> {
  return openSession("sign-in", email, password);
}

export function signUp(email: string, password: string): Promise<AccountResult> {
  return openSession("sign-up", email, password);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut({ scope: "local" });
}

export function readSessionEmail(): Promise<string | null> {
  return getSessionEmail();
}
