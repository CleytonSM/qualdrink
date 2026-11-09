import assert from "node:assert/strict";
import { test } from "node:test";

import { createRecognitionHandler } from "./handler.ts";
import { openAIRequest } from "./openai.ts";

const image = { imageBase64: Buffer.from([255, 216, 255, 217]).toString("base64"), mimeType: "image/jpeg" };
const env: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "public-key",
  OPENAI_API_KEY: "server-secret",
};
const answer = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const completed = (text: string, status = "completed") => ({
  status, error: null, incomplete_details: null,
  output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }],
});
function request(body: unknown = image, token = "session-token") {
  return new Request("https://example.supabase.co/functions/v1/identify-ingredients", {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}
function setup(provider: () => Response | Promise<Response>, extra: {
  user?: unknown; authStatus?: number; config?: Record<string, string>; timeoutMs?: number;
} = {}) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const handler = createRecognitionHandler({
    env: (key) => ({ ...env, ...extra.config })[key], timeoutMs: extra.timeoutMs,
    fetch: (async (url, options) => {
      calls.push({ url: String(url), options });
      return String(url).endsWith("/auth/v1/user")
        ? answer(extra.user ?? { id: "user-a", is_anonymous: false }, extra.authStatus ?? 200)
        : provider();
    }) as typeof fetch,
  });
  return { handler, calls };
}

test("Auth é validado antes de chamar OpenAI; cliente recebe só IDs deduplicados", async () => {
  const { handler, calls } = setup(() => answer(completed('{"ingredientIds":["limao","limao","gelo"]}')));
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ingredientIds: ["limao", "gelo"] });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/auth\/v1\/user$/);
  assert.equal(new Headers(calls[0].options?.headers).get("Authorization"), "Bearer session-token");
  assert.equal(calls[1].url, "https://api.openai.com/v1/responses");
  assert.equal(new Headers(calls[1].options?.headers).get("Authorization"), "Bearer server-secret");
  const body = JSON.parse(String(calls[1].options?.body));
  assert.equal(body.model, "gpt-4.1-mini");
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 512);
  assert.equal(body.input[0].content[1].image_url, `data:image/jpeg;base64,${image.imageBase64}`);
  assert.equal(body.text.format.strict, true);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
});

test("sem token, sessão expirada e usuário anônimo nunca enviam foto ao provedor", async () => {
  for (const config of [{ token: "" }, { authStatus: 401 }, { user: { id: "anon", is_anonymous: true } }, { user: {} }]) {
    const { handler, calls } = setup(() => { throw new Error("não deve chamar"); }, config);
    const result = await handler(request(image, "token" in config ? config.token : "session-token"));
    assert.equal(result.status, 401);
    assert.equal(calls.some((call) => call.url.includes("api.openai.com")), false);
  }
});

test("chave OpenAI é obrigatória e configuração Gemini não é usada como fallback", async () => {
  for (const config of [{ OPENAI_API_KEY: "" },
    { OPENAI_API_KEY: "", GEMINI_API_KEY: "unused-old-key", GEMINI_FREE_TIER_CONFIRMED: "true" },
    { OPENAI_VISION_MODEL: "../invalid-model" }]) {
    const { handler, calls } = setup(() => { throw new Error("não deve chamar"); }, { config });
    assert.equal((await handler(request())).status, 503);
    assert.equal(calls.length, 1);
  }
});

test("imagem inválida é recusada antes de chegar à OpenAI", async () => {
  const { handler, calls } = setup(() => { throw new Error("não deve chamar"); });
  const result = await handler(request({ mimeType: "image/png", imageBase64: "nonsense" }));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 1);
});

test("respostas malformadas, incompletas e recusas nunca viram ingredientes", async () => {
  for (const value of [completed("not json"), completed('{"ingredientIds":["abacaxi"]}'),
    completed('{"ingredientIds":[]}', "incomplete"), {},
    { ...completed('{"ingredientIds":[]}'), error: { code: "server_error" } },
    { ...completed('{"ingredientIds":[]}'), incomplete_details: { reason: "max_output_tokens" } },
    { ...completed('{"ingredientIds":[]}'), output: [{ type: "message", role: "assistant", status: "completed",
      content: [{ type: "refusal", refusal: "Cannot process" }] }] },
    { status: "completed", output_text: '{"ingredientIds":[]}' }]) {
    const { handler } = setup(() => answer(value));
    const result = await handler(request());
    assert.equal(result.status, 502);
    assert.deepEqual(await result.json(), { error: { code: "invalid_response" } });
  }
  const { handler } = setup(() => answer(completed('{"ingredientIds":[]}')));
  assert.deepEqual(await (await handler(request())).json(), { ingredientIds: [] });
});

test("cota e falhas do provedor não expõem corpo bruto nem repetem requisição", async () => {
  for (const status of [401, 403, 404, 500]) {
    const { handler, calls } = setup(() => new Response("server-secret private details", { status }));
    const result = await handler(request());
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: { code: "unavailable" } });
    assert.equal(calls.length, 2);
  }
});

test("créditos esgotados e limite de frequência são distintos e não têm retry", async () => {
  for (const [providerCode, expected] of [
    ["insufficient_quota", "quota_exceeded"], ["credit_balance_exhausted", "quota_exceeded"],
    ["rate_limit_exceeded", "rate_limited"], ["unknown_limit", "rate_limited"],
  ]) {
    const { handler, calls } = setup(() => answer({ error: { code: providerCode, message: "private provider details" } }, 429));
    const result = await handler(request());
    assert.equal(result.status, 429);
    assert.deepEqual(await result.json(), { error: { code: expected } });
    assert.equal(calls.length, 2);
  }
});

test("modelo explícito é respeitado sem tentar outro automaticamente", async () => {
  const { handler, calls } = setup(() => answer(completed('{"ingredientIds":["hortela"]}')),
    { config: { OPENAI_VISION_MODEL: "test-model" } });
  assert.equal((await handler(request())).status, 200);
  assert.equal(JSON.parse(String(calls[1].options?.body)).model, "test-model");
  assert.equal(calls.length, 2);
});

test("deadline do servidor funciona mesmo com transporte sem abort", async () => {
  const { handler, calls } = setup(() => new Promise(() => {}), { timeoutMs: 10 });
  const result = await handler(request());
  assert.equal(result.status, 504);
  assert.deepEqual(await result.json(), { error: { code: "timeout" } });
  assert.equal(calls[1].options?.signal?.aborted, true);
});

test("CORS e métodos inválidos não chamam serviços; prompt restringe inferências", async () => {
  const { handler, calls } = setup(() => { throw new Error("não deve chamar"); });
  assert.equal((await handler(new Request("https://example.com", { method: "OPTIONS" }))).status, 200);
  assert.equal((await handler(new Request("https://example.com"))).status, 405);
  assert.equal(calls.length, 0);
  const body = JSON.stringify(openAIRequest(image as { imageBase64: string; mimeType: "image/jpeg" }));
  assert.match(body, /não confiável/);
  assert.match(body, /Fruta inteira não é suco/);
  assert.match(body, /json_schema/);
});
