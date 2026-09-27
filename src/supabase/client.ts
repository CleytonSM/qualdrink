import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { secureStoreAdapter } from "@/src/supabase/secure-store";

let client: SupabaseClient | null | undefined;
let refreshBound = false;

function publicEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function configuredUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function bindAutoRefresh(supabase: SupabaseClient): void {
  if (refreshBound || Platform.OS === "web") {
    return;
  }
  refreshBound = true;
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
      return;
    }
    supabase.auth.stopAutoRefresh();
  });
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const url = publicEnv("EXPO_PUBLIC_SUPABASE_URL");
  const key = publicEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!configuredUrl(url) || key.length === 0) {
    client = null;
    return client;
  }

  const supabase = createClient(url, key, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  bindAutoRefresh(supabase);
  client = supabase;
  return client;
}

export async function getSessionUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return null;
  }
  return data.session.user.id;
}

export async function getSessionEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return null;
  }
  return data.session.user.email ?? null;
}
