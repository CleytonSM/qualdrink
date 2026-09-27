import type { DrinkCategory, IngredientCategory } from "@/src/data/seed";

export const ingredientCategoryOrder = [
  "destilado",
  "citrico",
  "mixer",
  "adocante",
  "fruta",
  "outro",
] as const satisfies readonly IngredientCategory[];

const ingredientLabels: Record<IngredientCategory, string> = {
  destilado: "Destilado",
  citrico: "Cítrico",
  mixer: "Mixer",
  adocante: "Adoçante",
  fruta: "Fruta",
  outro: "Outros",
};

const drinkLabels: Record<DrinkCategory, string> = {
  brasileiro: "Brasileiro",
  classico: "Clássico",
  sem_alcool: "Sem álcool",
};

export function ingredientCategoryLabel(category: IngredientCategory): string {
  return ingredientLabels[category];
}

export function drinkCategoryLabel(category: DrinkCategory): string {
  return drinkLabels[category];
}
