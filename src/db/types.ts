import type { DrinkCategory, IngredientCategory } from "@/src/data/seed";

export type DrinkListItem = {
  id: string;
  name: string;
  category: DrinkCategory;
  alcoholic: boolean;
};

export type DrinkIngredientDetail = {
  id: string;
  name: string;
  amount: string;
  unit: string;
};

export type DrinkDetail = DrinkListItem & {
  description: string;
  steps: string[];
  ingredients: DrinkIngredientDetail[];
  isFavorite: boolean;
};

export type IdentifyHit = DrinkListItem & {
  matched: number;
  total: number;
  coveragePercent: number;
};

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
};
