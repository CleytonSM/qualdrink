import type { DrinkIngredientDetail } from "@/src/db/types";
import { ingredientColors as ink } from "@/src/theme/colors";

export type IngredientShape = "liquid" | "sugar" | "ice" | "citrus" | "leaf" | "other";

const liquidColors: Record<string, string> = {
  cachaca: ink.clear, vodka: ink.clear, gin: ink.clear, rum: ink.amber,
  tequila: ink.amber, whisky: ink.amber, licor_laranja: ink.orange,
  campari: ink.red, vermute_rosso: ink.vermouth, aperol: ink.orange,
  espumante: ink.pineapple, agua_tonica: ink.clear, agua_com_gas: ink.clear,
  cola: ink.cola, ginger_beer: ink.amber, suco_cranberry: ink.cranberry,
  suco_abacaxi: ink.pineapple, leite_coco: ink.cream, leite_condensado: ink.cream,
  limao: ink.lime, laranja: ink.orange,
};

export function measuredMl(item: DrinkIngredientDetail): number {
  if (!/^ml(?:\s|$)/i.test(item.unit.trim())) return 0;
  const amount = Number(item.amount.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function ingredientAppearance(item: DrinkIngredientDetail): { shape: IngredientShape; color: string } {
  if (item.id === "acucar") return { shape: "sugar", color: ink.sugar };
  if (item.id === "gelo") return { shape: "ice", color: ink.ice };
  if (item.id === "hortela") return { shape: "leaf", color: ink.mint };
  if ((item.id === "limao" || item.id === "laranja") && !/^ml(?:\s|$)/i.test(item.unit.trim())) {
    return { shape: "citrus", color: liquidColors[item.id] };
  }
  const color = liquidColors[item.id];
  return { shape: color || measuredMl(item) ? "liquid" : "other", color: color ?? ink.clear };
}

export function doseLayers(ingredients: readonly DrinkIngredientDetail[]) {
  return ingredients.flatMap((item) => {
    const ml = measuredMl(item);
    return ml > 0 ? [{ id: item.id, ml, color: ingredientAppearance(item).color }] : [];
  });
}
