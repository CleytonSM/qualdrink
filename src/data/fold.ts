/** Nome dobrado para busca: sem acento, sem espaços nas pontas, minúsculas. */
export function foldName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}
