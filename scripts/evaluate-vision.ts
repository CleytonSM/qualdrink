import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { parseEvaluationManifest, summarizeEvaluation, type EvaluatedSample } from "../src/vision/evaluation";
import { createRecognitionClient } from "../src/vision/recognition";
import { parseRecognitionImage, RecognitionError } from "../supabase/functions/_shared/vision-contract";

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const file = args.find((arg) => arg !== "--validate-only");
  if (!file) throw new Error("Uso: npm run vision:evaluate -- [--validate-only] caminho/manifesto.json");
  const manifest = resolve(file);
  const samples = parseEvaluationManifest(JSON.parse(readFileSync(manifest, "utf8")));
  // Valida todos os rótulos e arquivos antes da primeira chamada de rede.
  const prepared = samples.map((sample) => ({ sample, image: parseRecognitionImage({
    mimeType: "image/jpeg", imageBase64: readFileSync(resolve(dirname(manifest), sample.file)).toString("base64"),
  }) }));
  if (validateOnly) { console.log(JSON.stringify({ valid: true, total: samples.length })); return; }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = process.env.QUALDRINK_EVAL_ACCESS_TOKEN;
  if (!url || !key || !token) throw new Error("Configure Supabase e QUALDRINK_EVAL_ACCESS_TOKEN de uma sessão válida; não use service role.");
  const client = createRecognitionClient({
    getSession: async () => ({ userId: "evaluation-session", accessToken: token }),
    async send(image, session, signal) {
      const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/identify-ingredients`, {
        method: "POST", signal, headers: {
          "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${session.accessToken}`,
        }, body: JSON.stringify(image),
      });
      let body: unknown = null;
      try { body = await response.json(); } catch { /* Cliente valida resposta. */ }
      return { status: response.status, body };
    },
  });
  const results: EvaluatedSample[] = [];
  for (const { sample, image } of prepared) {
    const start = performance.now();
    try {
      const result = await client.analyze(image);
      results.push({ ...sample, predictedIngredientIds: result?.ingredientIds ?? [], latencyMs: performance.now() - start });
    } catch (error) {
      results.push({ ...sample, predictedIngredientIds: [], latencyMs: performance.now() - start,
        errorCode: error instanceof RecognitionError ? error.code : "unavailable" });
      // Não gastar a franquia restante se a sessão/cota/configuração bloqueia a avaliação.
      if (error instanceof RecognitionError && ["unauthorized", "quota_exceeded", "rate_limited", "unavailable"].includes(error.code)) break;
    }
  }
  const summary = summarizeEvaluation(results);
  console.log(JSON.stringify({ evaluatedAt: new Date().toISOString(), summary,
    samples: results.map(({ file: _file, ...result }) => result) }, null, 2));
  if (!summary.passed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  const message = error instanceof RecognitionError ? error.message
    : error instanceof Error && error.name !== "TypeError" ? error.message : "Falha na avaliação.";
  console.error(message);
  process.exitCode = 1;
});
