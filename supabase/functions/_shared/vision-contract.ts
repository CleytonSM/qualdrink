import { ingredients } from "./catalog.ts";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3);
export const ANALYSIS_TIMEOUT_MS = 30_000;

export const recognitionMessages = {
  unauthorized: "Entre na sua conta para analisar uma foto.",
  invalid_image: "Não foi possível usar essa foto. Escolha uma imagem de até 2 MB.",
  invalid_response: "Não foi possível interpretar a análise. Tente outra foto ou selecione manualmente.",
  quota_exceeded: "Os créditos ou a cota de análise estão indisponíveis. Selecione os ingredientes manualmente.",
  rate_limited: "Muitas análises neste momento. Aguarde um pouco ou selecione manualmente.",
  timeout: "A análise demorou mais de 30 segundos. Tente de novo ou selecione manualmente.",
  unavailable: "A análise de fotos está indisponível. Selecione os ingredientes manualmente.",
  network: "Sem conexão com a análise. Tente de novo ou selecione manualmente.",
  cancelled: "Análise cancelada.",
} as const;

export type RecognitionErrorCode = keyof typeof recognitionMessages;
export type RecognitionResult = { ingredientIds: string[] };
export type RecognitionImage = { imageBase64: string; mimeType: "image/jpeg" };

export class RecognitionError extends Error {
  constructor(public readonly code: RecognitionErrorCode) {
    super(recognitionMessages[code]);
    this.name = "RecognitionError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRecognitionResult(value: unknown): RecognitionResult {
  const allowed = new Set(ingredients.map((item) => item.id));
  if (
    !isRecord(value) || Object.keys(value).length !== 1 ||
    !Array.isArray(value.ingredientIds) || value.ingredientIds.length > ingredients.length ||
    value.ingredientIds.some((id) => typeof id !== "string" || !allowed.has(id))
  ) {
    throw new RecognitionError("invalid_response");
  }
  return { ingredientIds: [...new Set(value.ingredientIds as string[])] };
}

export function parseRecognitionImage(value: unknown): RecognitionImage {
  if (
    !isRecord(value) || value.mimeType !== "image/jpeg" ||
    typeof value.imageBase64 !== "string" || !value.imageBase64 ||
    value.imageBase64.length > MAX_IMAGE_BASE64_LENGTH ||
    value.imageBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value.imageBase64)
  ) {
    throw new RecognitionError("invalid_image");
  }
  // Não depender de atob no runtime mobile nem decodificar 2 MiB só para ler os marcadores.
  const base64 = value.imageBase64;
  const length = base64.length / 4 * 3 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const byteAt = (index: number) => {
    const bit = index * 8;
    const start = Math.floor(bit / 6);
    return ((alphabet.indexOf(base64[start]) << 6 | alphabet.indexOf(base64[start + 1])) >> (4 - bit % 6)) & 255;
  };
  if (
    length > MAX_IMAGE_BYTES || length < 4 ||
    byteAt(0) !== 0xff || byteAt(1) !== 0xd8 ||
    byteAt(length - 2) !== 0xff || byteAt(length - 1) !== 0xd9
  ) {
    throw new RecognitionError("invalid_image");
  }
  return { imageBase64: value.imageBase64, mimeType: "image/jpeg" };
}

export function recognitionErrorCode(value: unknown): RecognitionErrorCode | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const code = value.error.code;
  return typeof code === "string" && Object.hasOwn(recognitionMessages, code)
    ? code as RecognitionErrorCode
    : null;
}
