import { getSupabase } from "@/src/supabase/client";
import { createRecognitionClient } from "@/src/vision/recognition";
import { RecognitionError } from "../../supabase/functions/_shared/vision-contract";

export function newPhotoRecognitionClient() {
  return createRecognitionClient({
    async getSession() {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return null;
      return { userId: data.session.user.id, accessToken: data.session.access_token };
    },
    async send(image, session, signal) {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) throw new RecognitionError("unavailable");
      const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/identify-ingredients`, {
        method: "POST", headers: {
          "Content-Type": "application/json", apikey: key,
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(image), signal,
      });
      let body: unknown = null;
      try { body = await response.json(); } catch { /* O contrato é validado pelo cliente. */ }
      return { status: response.status, body };
    },
  });
}
