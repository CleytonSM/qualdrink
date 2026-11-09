import { ingredients } from "../../supabase/functions/_shared/catalog";
import { isRecord, parseRecognitionResult, type RecognitionErrorCode } from "../../supabase/functions/_shared/vision-contract";

export type EvaluationKind = "food" | "packaging" | "negative";
export type EvaluationSample = {
  id: string; kind: EvaluationKind; file: string; expectedIngredientIds: string[];
};
export type EvaluatedSample = EvaluationSample & {
  predictedIngredientIds: string[]; latencyMs: number; errorCode?: RecognitionErrorCode;
};

export function parseEvaluationManifest(value: unknown): EvaluationSample[] {
  if (!Array.isArray(value) || value.length !== 30) throw new Error("O manifesto precisa conter exatamente 30 fotos rotuladas.");
  const ids = new Set<string>();
  const samples = value.map((row): EvaluationSample => {
    if (!isRecord(row) || typeof row.id !== "string" || !row.id || ids.has(row.id) ||
      typeof row.file !== "string" || !row.file ||
      !["food", "packaging", "negative"].includes(String(row.kind))) {
      throw new Error("Preencha IDs únicos, arquivos e categorias válidas no manifesto.");
    }
    ids.add(row.id);
    const expected = parseRecognitionResult({ ingredientIds: row.expectedIngredientIds }).ingredientIds;
    if ((row.kind === "negative") !== (expected.length === 0)) {
      throw new Error("Fotos claras precisam de rótulos; fotos negativas precisam de lista vazia.");
    }
    return { id: row.id, file: row.file, kind: row.kind as EvaluationKind, expectedIngredientIds: expected };
  });
  for (const kind of ["food", "packaging", "negative"]) {
    if (samples.filter((sample) => sample.kind === kind).length !== 10) {
      throw new Error("Use 10 fotos de alimentos, 10 de embalagens e 10 negativas/ambíguas.");
    }
  }
  return samples;
}

export function summarizeEvaluation(samples: readonly EvaluatedSample[]) {
  const counts = new Map(ingredients.map(({ id }) => [id, { truePositive: 0, falsePositive: 0, falseNegative: 0 }]));
  let tp = 0, fp = 0, fn = 0;
  for (const sample of samples) {
    const expected = new Set(sample.expectedIngredientIds);
    const predicted = new Set(sample.predictedIngredientIds);
    for (const [id, tally] of counts) {
      if (expected.has(id) && predicted.has(id)) tally.truePositive++;
      else if (predicted.has(id)) tally.falsePositive++;
      else if (expected.has(id)) tally.falseNegative++;
    }
    if (sample.kind === "negative") continue;
    tp += [...predicted].filter((id) => expected.has(id)).length;
    fp += [...predicted].filter((id) => !expected.has(id)).length;
    fn += [...expected].filter((id) => !predicted.has(id)).length;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const failed = samples.filter((sample) => sample.errorCode).length;
  const negativeFalsePositives = samples.filter((sample) => sample.kind === "negative" && sample.predictedIngredientIds.length > 0).length;
  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const complete = samples.length === 30 && ["food", "packaging", "negative"]
    .every((kind) => samples.filter((sample) => sample.kind === kind).length === 10);
  return {
    total: samples.length, failed, precision, recall, negativeFalsePositives,
    meanLatencyMs: latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0,
    p95LatencyMs: latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0,
    perIngredient: Object.fromEntries([...counts].map(([id, tally]) => [id, {
      ...tally,
      precision: tally.truePositive + tally.falsePositive > 0
        ? tally.truePositive / (tally.truePositive + tally.falsePositive) : null,
      recall: tally.truePositive + tally.falseNegative > 0
        ? tally.truePositive / (tally.truePositive + tally.falseNegative) : null,
    }])),
    passed: complete && failed === 0 && precision >= 0.9 && recall >= 0.8 && negativeFalsePositives === 0,
  };
}
