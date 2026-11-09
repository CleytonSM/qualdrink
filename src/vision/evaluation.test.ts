import assert from "node:assert/strict";
import { test } from "node:test";

import { parseEvaluationManifest, summarizeEvaluation, type EvaluatedSample } from "./evaluation";

function samples(): EvaluatedSample[] {
  return (["food", "packaging", "negative"] as const).flatMap((kind) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `${kind}-${index}`, kind, file: `${kind}-${index}.jpg`,
      expectedIngredientIds: kind === "negative" ? [] : ["limao"],
      predictedIngredientIds: kind === "negative" ? [] : ["limao"], latencyMs: 100 + index,
    })));
}

test("avaliação completa calcula acertos, latência e métricas por ingrediente", () => {
  assert.equal(parseEvaluationManifest(samples()).length, 30);
  const report = summarizeEvaluation(samples());
  assert.equal(report.passed, true);
  assert.equal(report.precision, 1);
  assert.equal(report.recall, 1);
  assert.equal(report.perIngredient.limao.truePositive, 20);
  assert.equal(report.perIngredient.gin.precision, null);
  assert.equal(report.p95LatencyMs, 109);
});

test("negativa com falso positivo ou falha de rede nunca passa como sucesso", () => {
  const falsePositive = samples();
  falsePositive[29].predictedIngredientIds = ["vodka"];
  assert.equal(summarizeEvaluation(falsePositive).passed, false);
  assert.equal(summarizeEvaluation(falsePositive).negativeFalsePositives, 1);
  const failure = samples();
  failure[29].errorCode = "network";
  assert.equal(summarizeEvaluation(failure).passed, false);
  assert.equal(summarizeEvaluation(failure).failed, 1);
});

test("amostra incompleta e recall baixo não atendem aceite", () => {
  assert.equal(summarizeEvaluation(samples().slice(0, 20)).passed, false);
  const missed = samples();
  for (let i = 0; i < 5; i++) missed[i].predictedIngredientIds = [];
  assert.equal(summarizeEvaluation(missed).recall, 0.75);
  assert.equal(summarizeEvaluation(missed).passed, false);
});

test("manifesto recusa placeholders, categorias desequilibradas e rótulos indevidos", () => {
  assert.throws(() => parseEvaluationManifest(samples().slice(1)));
  for (const patch of [{ file: "" }, { expectedIngredientIds: null }, { kind: "negative" },
    { expectedIngredientIds: ["fora_do_catalogo"] }, { expectedIngredientIds: [] }]) {
    const invalid: unknown[] = samples();
    invalid[0] = { ...samples()[0], ...patch };
    assert.throws(() => parseEvaluationManifest(invalid));
  }
});
