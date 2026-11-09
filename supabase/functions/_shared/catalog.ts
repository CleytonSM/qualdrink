/** Catálogo canônico de ingredientes: compartilhado pelo seed offline e pela visão. */
export type IngredientCategory =
  | "destilado"
  | "citrico"
  | "mixer"
  | "adocante"
  | "fruta"
  | "outro";

export type IngredientRecord = {
  id: string;
  name: string;
  category: IngredientCategory;
};

export const ingredients: readonly IngredientRecord[] = [
  { id: "cachaca", name: "Cachaça", category: "destilado" },
  { id: "vodka", name: "Vodka", category: "destilado" },
  { id: "gin", name: "Gin", category: "destilado" },
  { id: "rum", name: "Rum", category: "destilado" },
  { id: "tequila", name: "Tequila", category: "destilado" },
  { id: "whisky", name: "Whisky", category: "destilado" },
  { id: "licor_laranja", name: "Licor de laranja", category: "destilado" },
  { id: "campari", name: "Campari", category: "destilado" },
  { id: "vermute_rosso", name: "Vermute rosso", category: "destilado" },
  { id: "aperol", name: "Aperol", category: "destilado" },
  { id: "espumante", name: "Espumante", category: "destilado" },
  { id: "limao", name: "Limão", category: "citrico" },
  { id: "laranja", name: "Laranja", category: "citrico" },
  { id: "agua_tonica", name: "Água tônica", category: "mixer" },
  { id: "agua_com_gas", name: "Água com gás", category: "mixer" },
  { id: "cola", name: "Refrigerante de cola", category: "mixer" },
  { id: "ginger_beer", name: "Ginger beer", category: "mixer" },
  { id: "suco_cranberry", name: "Suco de cranberry", category: "mixer" },
  { id: "suco_abacaxi", name: "Suco de abacaxi", category: "mixer" },
  { id: "leite_coco", name: "Leite de coco", category: "mixer" },
  { id: "acucar", name: "Açúcar", category: "adocante" },
  { id: "leite_condensado", name: "Leite condensado", category: "adocante" },
  { id: "hortela", name: "Hortelã", category: "outro" },
  { id: "gelo", name: "Gelo", category: "outro" },
];
