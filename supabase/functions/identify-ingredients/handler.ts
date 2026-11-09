import { DEFAULT_VISION_MODEL, openAIErrorCode, openAIRequest, parseOpenAIResponse } from "./openai.ts";
import {
  isRecord,
  MAX_IMAGE_BASE64_LENGTH,
  parseRecognitionImage,
  RecognitionError,
  type RecognitionErrorCode,
  type RecognitionImage,
} from "../_shared/vision-contract.ts";

type Options = {
  env: (name: string) => string | undefined;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const statuses: Record<RecognitionErrorCode, number> = {
  unauthorized: 401, invalid_image: 400, invalid_response: 502, quota_exceeded: 429, rate_limited: 429,
  timeout: 504, unavailable: 503, network: 503, cancelled: 499,
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

function failure(code: RecognitionErrorCode): Response {
  return json({ error: { code } }, statuses[code]);
}

async function readImage(request: Request): Promise<RecognitionImage> {
  const limit = MAX_IMAGE_BASE64_LENGTH + 256;
  if (
    !request.headers.get("content-type")?.toLowerCase().startsWith("application/json") ||
    Number(request.headers.get("content-length")) > limit || !request.body
  ) throw new RecognitionError("invalid_image");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RecognitionError("invalid_image");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    return parseRecognitionImage(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new RecognitionError("invalid_image");
  }
}

export function createRecognitionHandler(options: Options) {
  const fetcher = options.fetch ?? fetch;
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: { code: "method_not_allowed" } }, 405);
    const authorization = request.headers.get("authorization");
    if (!authorization || !/^Bearer \S+$/i.test(authorization)) return failure("unauthorized");

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => controller.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });
    const operation = async () => {
      const url = options.env("SUPABASE_URL");
      const anonKey = options.env("SUPABASE_ANON_KEY");
      if (!url || !anonKey) throw new RecognitionError("unavailable");
      const session = await fetcher(`${url.replace(/\/$/, "")}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: anonKey }, signal: controller.signal,
      });
      if (!session.ok) {
        throw new RecognitionError(session.status === 401 || session.status === 403
          ? "unauthorized" : "unavailable");
      }
      const user: unknown = await session.json();
      if (!isRecord(user) || typeof user.id !== "string" || !user.id || user.is_anonymous === true) {
        throw new RecognitionError("unauthorized");
      }
      const key = options.env("OPENAI_API_KEY")?.trim();
      const model = options.env("OPENAI_VISION_MODEL")?.trim() || DEFAULT_VISION_MODEL;
      if (!key || !/^[a-zA-Z0-9.-]+$/.test(model)) {
        throw new RecognitionError("unavailable");
      }
      const image = await readImage(request);
      if (controller.signal.aborted) throw new RecognitionError("cancelled");
      const response = await fetcher(
        "https://api.openai.com/v1/responses",
        {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(openAIRequest(image, model)), signal: controller.signal,
        },
      );
      if (!response.ok) {
        let body: unknown = null;
        try { body = await response.json(); } catch { /* Não exibir erros brutos do provedor. */ }
        throw new RecognitionError(openAIErrorCode(response.status, body));
      }
      let body: unknown;
      try { body = await response.json(); } catch { throw new RecognitionError("invalid_response"); }
      return json(parseOpenAIResponse(body));
    };
    try {
      if (request.signal.aborted) return failure("cancelled");
      return await Promise.race([
        operation(),
        new Promise<Response>((_, reject) => {
          timer = setTimeout(() => {
            reject(new RecognitionError("timeout"));
            controller.abort();
          }, options.timeoutMs ?? 28_000);
        }),
      ]);
    } catch (error) {
      return failure(error instanceof RecognitionError ? error.code : "unavailable");
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", onAbort);
    }
  };
}
