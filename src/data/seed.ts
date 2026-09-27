export type IngredientCategory =
  | "destilado"
  | "citrico"
  | "mixer"
  | "adocante"
  | "fruta"
  | "outro";

export type DrinkCategory = "brasileiro" | "classico" | "sem_alcool";

export type IngredientRecord = {
  id: string;
  name: string;
  category: IngredientCategory;
};

export type DrinkRecord = {
  id: string;
  name: string;
  category: DrinkCategory;
  description: string;
  steps: readonly string[];
  alcoholic: boolean;
};

export type DoseRecord = {
  drinkId: string;
  ingredientId: string;
  amount: string;
  unit: string;
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

export const drinks: readonly DrinkRecord[] = [
  {
    id: "caipirinha",
    name: "Caipirinha",
    category: "brasileiro",
    description: "Cachaça com limão e açúcar, servida bem gelada.",
    alcoholic: true,
    steps: [
      "Corte o limão em pedaços.",
      "Macere o limão com o açúcar no copo.",
      "Complete com cachaça e gelo.",
    ],
  },
  {
    id: "caipiroska",
    name: "Caipiroska",
    category: "classico",
    description: "A mesma base da caipirinha, com vodka no lugar da cachaça.",
    alcoholic: true,
    steps: [
      "Corte o limão em pedaços.",
      "Macere o limão com o açúcar no copo.",
      "Complete com vodka e gelo.",
    ],
  },
  {
    id: "mojito",
    name: "Mojito",
    category: "classico",
    description: "Rum, hortelã e limão, completado com água com gás.",
    alcoholic: true,
    steps: [
      "Macere o limão, a hortelã e o açúcar.",
      "Junte o rum e o gelo.",
      "Complete com água com gás.",
    ],
  },
  {
    id: "gin_tonica",
    name: "Gin tônica",
    category: "classico",
    description: "Gin com água tônica e um corte de limão.",
    alcoholic: true,
    steps: [
      "Encha o copo com gelo.",
      "Adicione o gin e complete com água tônica.",
      "Finalize com a fatia de limão.",
    ],
  },
  {
    id: "cuba_libre",
    name: "Cuba libre",
    category: "classico",
    description: "Rum com refrigerante de cola e limão.",
    alcoholic: true,
    steps: [
      "Encha o copo com gelo.",
      "Adicione o rum e o limão.",
      "Complete com refrigerante de cola.",
    ],
  },
  {
    id: "moscow_mule",
    name: "Moscow mule",
    category: "classico",
    description: "Vodka com ginger beer e limão.",
    alcoholic: true,
    steps: [
      "Encha o copo com gelo.",
      "Adicione a vodka e o limão.",
      "Complete com ginger beer.",
    ],
  },
  {
    id: "margarita",
    name: "Margarita",
    category: "classico",
    description: "Tequila, licor de laranja e limão, servida gelada.",
    alcoholic: true,
    steps: [
      "Junte tequila, licor de laranja e limão na coqueteleira com gelo.",
      "Bata até gelar.",
      "Sirva sem coar o gelo, ou coe se preferir o copo limpo.",
    ],
  },
  {
    id: "pina_colada",
    name: "Piña colada",
    category: "classico",
    description: "Rum batido com abacaxi e leite de coco.",
    alcoholic: true,
    steps: ["Bata rum, suco de abacaxi, leite de coco e gelo.", "Sirva em seguida."],
  },
  {
    id: "negroni",
    name: "Negroni",
    category: "classico",
    description: "Partes iguais de gin, Campari e vermute rosso.",
    alcoholic: true,
    steps: ["Junte gin, Campari e vermute no copo com gelo.", "Mexa até gelar."],
  },
  {
    id: "aperol_spritz",
    name: "Aperol spritz",
    category: "classico",
    description: "Aperol com espumante e um pouco de água com gás.",
    alcoholic: true,
    steps: [
      "Coloque gelo no copo.",
      "Adicione Aperol e espumante.",
      "Complete com água com gás.",
    ],
  },
  {
    id: "whisky_sour",
    name: "Whisky sour",
    category: "classico",
    description: "Whisky, limão e açúcar. Esta versão não leva clara de ovo.",
    alcoholic: true,
    steps: ["Bata whisky, limão e açúcar com gelo.", "Sirva no copo."],
  },
  {
    id: "cosmopolitan",
    name: "Cosmopolitan",
    category: "classico",
    description: "Vodka, licor de laranja, cranberry e limão.",
    alcoholic: true,
    steps: [
      "Bata vodka, licor de laranja, suco de cranberry e limão com gelo.",
      "Coe e sirva.",
    ],
  },
  {
    id: "mojito_sem_alcool",
    name: "Mojito sem álcool",
    category: "sem_alcool",
    description: "Hortelã, limão e água com gás, sem rum.",
    alcoholic: false,
    steps: [
      "Macere o limão, a hortelã e o açúcar.",
      "Junte o gelo.",
      "Complete com água com gás.",
    ],
  },
  {
    id: "limonada_suica",
    name: "Limonada suíça",
    category: "sem_alcool",
    description: "Limão batido com leite condensado e gelo.",
    alcoholic: false,
    steps: ["Bata o limão, o leite condensado e o gelo.", "Sirva em seguida."],
  },
];

export const drinkIngredients: readonly DoseRecord[] = [
  { drinkId: "caipirinha", ingredientId: "cachaca", amount: "50", unit: "ml" },
  { drinkId: "caipirinha", ingredientId: "limao", amount: "1", unit: "unidade" },
  { drinkId: "caipirinha", ingredientId: "acucar", amount: "2", unit: "colher de chá" },
  { drinkId: "caipirinha", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "caipiroska", ingredientId: "vodka", amount: "50", unit: "ml" },
  { drinkId: "caipiroska", ingredientId: "limao", amount: "1", unit: "unidade" },
  { drinkId: "caipiroska", ingredientId: "acucar", amount: "2", unit: "colher de chá" },
  { drinkId: "caipiroska", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "mojito", ingredientId: "rum", amount: "50", unit: "ml" },
  { drinkId: "mojito", ingredientId: "limao", amount: "1", unit: "unidade" },
  { drinkId: "mojito", ingredientId: "hortela", amount: "8", unit: "folhas" },
  { drinkId: "mojito", ingredientId: "acucar", amount: "2", unit: "colher de chá" },
  { drinkId: "mojito", ingredientId: "agua_com_gas", amount: "1", unit: "completar o copo" },
  { drinkId: "mojito", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "gin_tonica", ingredientId: "gin", amount: "50", unit: "ml" },
  { drinkId: "gin_tonica", ingredientId: "agua_tonica", amount: "150", unit: "ml" },
  { drinkId: "gin_tonica", ingredientId: "limao", amount: "1", unit: "fatia" },
  { drinkId: "gin_tonica", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "cuba_libre", ingredientId: "rum", amount: "50", unit: "ml" },
  { drinkId: "cuba_libre", ingredientId: "cola", amount: "120", unit: "ml" },
  { drinkId: "cuba_libre", ingredientId: "limao", amount: "1", unit: "fatia" },
  { drinkId: "cuba_libre", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "moscow_mule", ingredientId: "vodka", amount: "50", unit: "ml" },
  { drinkId: "moscow_mule", ingredientId: "ginger_beer", amount: "120", unit: "ml" },
  { drinkId: "moscow_mule", ingredientId: "limao", amount: "0,5", unit: "unidade" },
  { drinkId: "moscow_mule", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "margarita", ingredientId: "tequila", amount: "50", unit: "ml" },
  { drinkId: "margarita", ingredientId: "licor_laranja", amount: "20", unit: "ml" },
  { drinkId: "margarita", ingredientId: "limao", amount: "30", unit: "ml" },
  { drinkId: "margarita", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "pina_colada", ingredientId: "rum", amount: "50", unit: "ml" },
  { drinkId: "pina_colada", ingredientId: "suco_abacaxi", amount: "90", unit: "ml" },
  { drinkId: "pina_colada", ingredientId: "leite_coco", amount: "30", unit: "ml" },
  { drinkId: "pina_colada", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "negroni", ingredientId: "gin", amount: "30", unit: "ml" },
  { drinkId: "negroni", ingredientId: "campari", amount: "30", unit: "ml" },
  { drinkId: "negroni", ingredientId: "vermute_rosso", amount: "30", unit: "ml" },
  { drinkId: "negroni", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "aperol_spritz", ingredientId: "aperol", amount: "60", unit: "ml" },
  { drinkId: "aperol_spritz", ingredientId: "espumante", amount: "90", unit: "ml" },
  { drinkId: "aperol_spritz", ingredientId: "agua_com_gas", amount: "30", unit: "ml" },
  { drinkId: "aperol_spritz", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "whisky_sour", ingredientId: "whisky", amount: "50", unit: "ml" },
  { drinkId: "whisky_sour", ingredientId: "limao", amount: "25", unit: "ml" },
  { drinkId: "whisky_sour", ingredientId: "acucar", amount: "1", unit: "colher de chá" },
  { drinkId: "whisky_sour", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "cosmopolitan", ingredientId: "vodka", amount: "40", unit: "ml" },
  { drinkId: "cosmopolitan", ingredientId: "licor_laranja", amount: "15", unit: "ml" },
  { drinkId: "cosmopolitan", ingredientId: "suco_cranberry", amount: "30", unit: "ml" },
  { drinkId: "cosmopolitan", ingredientId: "limao", amount: "15", unit: "ml" },
  { drinkId: "cosmopolitan", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "mojito_sem_alcool", ingredientId: "limao", amount: "1", unit: "unidade" },
  { drinkId: "mojito_sem_alcool", ingredientId: "hortela", amount: "8", unit: "folhas" },
  { drinkId: "mojito_sem_alcool", ingredientId: "acucar", amount: "2", unit: "colher de chá" },
  { drinkId: "mojito_sem_alcool", ingredientId: "agua_com_gas", amount: "1", unit: "completar o copo" },
  { drinkId: "mojito_sem_alcool", ingredientId: "gelo", amount: "1", unit: "copo" },
  { drinkId: "limonada_suica", ingredientId: "limao", amount: "2", unit: "unidades" },
  { drinkId: "limonada_suica", ingredientId: "leite_condensado", amount: "3", unit: "colheres de sopa" },
  { drinkId: "limonada_suica", ingredientId: "gelo", amount: "1", unit: "copo" },
];

export function assertSeed(): void {
  if (drinks.length !== 14) {
    throw new Error(`O catálogo precisa ter 14 drinks, veio ${drinks.length}.`);
  }

  const ingredientIds = new Set<string>();
  for (const ingredient of ingredients) {
    if (ingredientIds.has(ingredient.id)) {
      throw new Error(`Ingrediente duplicado: ${ingredient.id}`);
    }
    ingredientIds.add(ingredient.id);
  }

  const drinkIds = new Set<string>();
  for (const drink of drinks) {
    if (drinkIds.has(drink.id)) {
      throw new Error(`Drink duplicado: ${drink.id}`);
    }
    drinkIds.add(drink.id);
    if (drink.steps.length === 0) {
      throw new Error(`Drink sem passos: ${drink.id}`);
    }
    const expectsAlcohol = drink.category !== "sem_alcool";
    if (drink.alcoholic !== expectsAlcohol) {
      throw new Error(`Álcool divergente da categoria: ${drink.id}`);
    }
  }

  const pairs = new Set<string>();
  const dosesPerDrink = new Map<string, number>();
  for (const dose of drinkIngredients) {
    if (!drinkIds.has(dose.drinkId)) {
      throw new Error(`Dose sem drink: ${dose.drinkId}`);
    }
    if (!ingredientIds.has(dose.ingredientId)) {
      throw new Error(`Dose sem ingrediente: ${dose.ingredientId}`);
    }
    const key = `${dose.drinkId}:${dose.ingredientId}`;
    if (pairs.has(key)) {
      throw new Error(`Dose duplicada: ${key}`);
    }
    pairs.add(key);
    dosesPerDrink.set(dose.drinkId, (dosesPerDrink.get(dose.drinkId) ?? 0) + 1);
  }

  for (const drink of drinks) {
    if ((dosesPerDrink.get(drink.id) ?? 0) === 0) {
      throw new Error(`Drink sem ingredientes: ${drink.id}`);
    }
  }
}
