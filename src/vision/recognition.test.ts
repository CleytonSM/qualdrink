import assert from "node:assert/strict";
import { test } from "node:test";

import { ingredients } from "../data/seed";
import { addIngredients, clearSelection, getSelectedIngredientIds, toggleIngredient } from "../data/selection";
import {
  MAX_IMAGE_BYTES, parseRecognitionImage, parseRecognitionResult, RecognitionError,
  type RecognitionErrorCode,
} from "../../supabase/functions/_shared/vision-contract";
import { createRecognitionClient } from "./recognition";

// Marcadores mínimos de JPEG para testes de contrato; não representam uma avaliação visual.
const image = { imageBase64: Buffer.from([255, 216, 255, 217]).toString("base64"), mimeType: "image/jpeg" as const };
const session = { userId: "user-a", accessToken: "test-token" };
const hasCode = (code: RecognitionErrorCode) => (error: unknown) =>
  error instanceof RecognitionError && error.code === code;
const response = { status: 200, body: { ingredientIds: ["limao", "hortela"] } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("catálogo mantém 24 IDs únicos e resultado vazio é válido", () => {
  assert.equal(ingredients.length, 24);
  assert.equal(new Set(ingredients.map((item) => item.id)).size, 24);
  assert.deepEqual(parseRecognitionResult({ ingredientIds: [] }), { ingredientIds: [] });
  assert.deepEqual(parseRecognitionResult({ ingredientIds: ["limao", "limao"] }), { ingredientIds: ["limao"] });
  for (const value of [null, [], {}, { ingredientIds: ["abacaxi"] }, { ingredientIds: [3] },
    { ingredientIds: "limao" }, { ingredientIds: [], confidence: 100 }]) {
    assert.throws(() => parseRecognitionResult(value), hasCode("invalid_response"));
  }
});

test("contrato rejeita imagem inválida, conteúdo sem JPEG e excesso de tamanho", () => {
  assert.deepEqual(parseRecognitionImage(image), image);
  for (const value of [null, { ...image, mimeType: "image/png" }, { ...image, imageBase64: "@@@@" },
    { ...image, imageBase64: "data:image/jpeg;base64," + image.imageBase64 },
    { ...image, imageBase64: Buffer.from("não é JPEG").toString("base64") }]) {
    assert.throws(() => parseRecognitionImage(value), hasCode("invalid_image"));
  }
  const maximum = Buffer.alloc(MAX_IMAGE_BYTES);
  maximum.set([255, 216]); maximum.set([255, 217], maximum.length - 2);
  assert.doesNotThrow(() => parseRecognitionImage({ ...image, imageBase64: maximum.toString("base64") }));
  assert.throws(() => parseRecognitionImage({ ...image,
    imageBase64: Buffer.concat([maximum, Buffer.from([0])]).toString("base64") }), hasCode("invalid_image"));
});

test("sem sessão não envia foto; sucesso não altera seleção até confirmação", async () => {
  let sends = 0;
  const anonymous = createRecognitionClient({ getSession: async () => null,
    send: async () => { sends++; return response; } });
  await assert.rejects(anonymous.analyze(image), hasCode("unauthorized"));
  assert.equal(sends, 0);
  clearSelection(); toggleIngredient("acucar");
  const client = createRecognitionClient({ getSession: async () => session, send: async () => response });
  const result = await client.analyze(image);
  assert.deepEqual(getSelectedIngredientIds(), ["acucar"]);
  addIngredients(result!.ingredientIds);
  addIngredients(["limao", "gelo"]);
  assert.deepEqual(getSelectedIngredientIds(), ["acucar", "limao", "hortela", "gelo"]);
  clearSelection();
});

test("somente uma análise em andamento e cancelar descarta resposta tardia", async () => {
  let sends = 0;
  const pending = deferred<typeof response>();
  const started = deferred<void>();
  const client = createRecognitionClient({ getSession: async () => session,
    send: async () => { sends++; started.resolve(); return pending.promise; } });
  const first = client.analyze(image);
  const rejected = assert.rejects(first, hasCode("cancelled"));
  await started.promise;
  assert.equal(client.running, true);
  assert.equal(await client.analyze(image), null);
  assert.equal(sends, 1);
  client.cancel();
  await rejected;
  pending.resolve(response);
  assert.equal(client.running, false);
});

test("cancelar durante leitura da sessão impede envio e permite nova análise", async () => {
  let sends = 0;
  const pendingSession = deferred<typeof session>();
  const client = createRecognitionClient({ getSession: () => pendingSession.promise,
    send: async () => { sends++; return response; } });
  const pending = client.analyze(image);
  const rejected = assert.rejects(pending, hasCode("cancelled"));
  client.cancel();
  pendingSession.resolve(session);
  await rejected;
  assert.equal(sends, 0);
  assert.deepEqual(await client.analyze(image), response.body);
});

test("timeout encerra análise mesmo se transporte ignorar abort; não repete chamada", async () => {
  let sends = 0;
  let signal: AbortSignal | undefined;
  const client = createRecognitionClient({ getSession: async () => session, timeoutMs: 10,
    send: async (_image, _session, incoming) => {
      sends++; signal = incoming; return new Promise(() => {});
    } });
  await assert.rejects(client.analyze(image), hasCode("timeout"));
  assert.equal(signal?.aborted, true);
  assert.equal(sends, 1);
  assert.equal(client.running, false);
});

test("resposta cancelada não encerra uma análise nova que ainda está em andamento", async () => {
  const oldResponse = deferred<typeof response>();
  const newResponse = deferred<typeof response>();
  const oldStarted = deferred<void>();
  const newStarted = deferred<void>();
  let sends = 0;
  const client = createRecognitionClient({ getSession: async () => session,
    send: async () => {
      sends++;
      if (sends === 1) { oldStarted.resolve(); return oldResponse.promise; }
      newStarted.resolve(); return newResponse.promise;
    } });
  const first = client.analyze(image);
  const rejected = assert.rejects(first, hasCode("cancelled"));
  await oldStarted.promise;
  client.cancel();
  const second = client.analyze(image);
  await newStarted.promise;
  oldResponse.resolve(response);
  await rejected;
  assert.equal(client.running, true);
  newResponse.resolve(response);
  assert.deepEqual(await second, response.body);
  assert.equal(client.running, false);
});

test("erros de sessão, cota e JSON inválido são tipados e preservam seleção", async () => {
  clearSelection(); toggleIngredient("gin");
  for (const [status, body, code] of [
    [401, {}, "unauthorized"], [429, { error: { code: "quota_exceeded" } }, "quota_exceeded"],
    [429, { error: { code: "rate_limited" } }, "rate_limited"],
    [200, { ingredientIds: ["fora_do_catalogo"] }, "invalid_response"],
    [200, null, "invalid_response"], [503, { secret: "never display" }, "unavailable"],
  ] as const) {
    const client = createRecognitionClient({ getSession: async () => session,
      send: async () => ({ status, body }) });
    await assert.rejects(client.analyze(image), hasCode(code));
    assert.deepEqual(getSelectedIngredientIds(), ["gin"]);
  }
  const offline = createRecognitionClient({ getSession: async () => session,
    send: async () => { throw new TypeError("Failed to fetch"); } });
  await assert.rejects(offline.analyze(image), hasCode("network"));
  clearSelection();
});
