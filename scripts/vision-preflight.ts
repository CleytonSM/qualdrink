import { DEFAULT_VISION_MODEL } from "../supabase/functions/identify-ingredients/openai";

/** Consulta metadados; não envia imagem nem comprova saldo ou qualidade visual. */
async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
  if (!key) {
    throw new Error("Preencha OPENAI_API_KEY em supabase/functions/.env. A análise usa créditos da API OpenAI.");
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(model)) throw new Error("Nome de modelo inválido.");
  const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OpenAI: modelo/chave não acessível (HTTP ${response.status}). Nenhuma alternativa de modelo foi utilizada.`);
  const info = await response.json();
  if (info.id !== model || info.object !== "model") {
    throw new Error("A OpenAI devolveu metadados inesperados para o modelo.");
  }
  console.log(JSON.stringify({ provider: "openai", model, accessible: true, billingCheckedByScript: false,
    note: "Metadados não comprovam saldo, permissões de Responses ou qualidade visual; o próximo teste precisa de uma foto real." }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error && error.name !== "TypeError" ? error.message : "Não foi possível consultar o provedor.");
  process.exitCode = 1;
});
