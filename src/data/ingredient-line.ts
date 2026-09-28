import type { DrinkIngredientName } from "@/src/db/types";

/** Gelo está em todas as receitas; na linha de resumo ele só ocupa espaço. */
const OMITTED_FROM_LINE = new Set(["gelo"]);

export function ingredientLine(items: readonly DrinkIngredientName[] | undefined): string {
  if (!items) {
    return "";
  }
  return items
    .filter((item) => !OMITTED_FROM_LINE.has(item.id))
    .map((item) => item.name)
    .join(" · ");
}
