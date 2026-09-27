import { foldName } from "@/src/data/fold";
import type { DrinkCategory, IngredientCategory } from "@/src/data/seed";

import type { SqlBind } from "@/src/db/schema";
import type {
  DrinkDetail,
  DrinkIngredientDetail,
  DrinkListItem,
  IdentifyHit,
  Ingredient,
} from "@/src/db/types";

export type SqlDb = {
  all<T>(sql: string, params?: readonly SqlBind[]): T[];
  first<T>(sql: string, params?: readonly SqlBind[]): T | null;
};

export type SqlWriteDb = SqlDb & {
  run(sql: string, params?: readonly SqlBind[]): void;
};

type DrinkRow = {
  id: string;
  name: string;
  category: string;
  alcoholic: number;
};

type IdentifyRow = DrinkRow & {
  matched: number;
  total: number;
};

type DrinkDetailRow = DrinkRow & {
  description: string;
  steps_json: string;
};

type IngredientRow = {
  id: string;
  name: string;
  category: string;
};

function drinkCategory(value: string): DrinkCategory {
  if (value === "brasileiro" || value === "classico" || value === "sem_alcool") {
    return value;
  }
  throw new Error(`Categoria de drink desconhecida: ${value}`);
}

function ingredientCategory(value: string): IngredientCategory {
  if (
    value === "destilado" ||
    value === "citrico" ||
    value === "mixer" ||
    value === "adocante" ||
    value === "fruta" ||
    value === "outro"
  ) {
    return value;
  }
  throw new Error(`Categoria de ingrediente desconhecida: ${value}`);
}

function toListItem(row: DrinkRow): DrinkListItem {
  return {
    id: row.id,
    name: row.name,
    category: drinkCategory(row.category),
    alcoholic: row.alcoholic === 1,
  };
}

function parseSteps(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((step) => typeof step !== "string")) {
    throw new Error("Passos da receita inválidos");
  }
  return parsed.filter((step): step is string => typeof step === "string");
}

function coveragePercent(matched: number, total: number): number {
  return Math.round((100 * matched) / total);
}

export function readViewerUserId(db: SqlDb): string | null {
  const row = db.first<{ value: string }>("select value from local_meta where key = ?", [
    "last_user_id",
  ]);
  return row?.value ?? null;
}

export function searchDrinksIn(db: SqlDb, term: string): DrinkListItem[] {
  const folded = foldName(term);
  if (folded === "") {
    return db
      .all<DrinkRow>("select id, name, category, alcoholic from drinks order by name asc")
      .map(toListItem);
  }

  return db
    .all<DrinkRow>(
      "select id, name, category, alcoholic from drinks where name_folded like '%' || ? || '%' order by name asc",
      [folded],
    )
    .map(toListItem);
}

export function identifyDrinksIn(db: SqlDb, ingredientIds: readonly string[]): IdentifyHit[] {
  if (ingredientIds.length === 0) {
    return [];
  }

  const marks = ingredientIds.map(() => "?").join(", ");
  const rows = db.all<IdentifyRow>(
    `select
      d.id,
      d.name,
      d.category,
      d.alcoholic,
      sum(case when di.ingredient_id in (${marks}) then 1 else 0 end) as matched,
      count(di.ingredient_id) as total
    from drinks d
    join drink_ingredients di on di.drink_id = d.id
    group by d.id
    having matched >= 1
    order by (matched * 1.0 / total) desc, matched desc, d.name asc`,
    ingredientIds,
  );

  return rows.map((row) => {
    const matched = Number(row.matched);
    const total = Number(row.total);
    return {
      ...toListItem(row),
      matched,
      total,
      coveragePercent: coveragePercent(matched, total),
    };
  });
}

export function getDrinkIn(db: SqlDb, id: string, viewerUserId: string | null): DrinkDetail | null {
  const row = db.first<DrinkDetailRow>(
    "select id, name, category, description, steps_json, alcoholic from drinks where id = ?",
    [id],
  );
  if (!row) {
    return null;
  }

  const ingredients = db.all<DrinkIngredientDetail>(
    `select di.ingredient_id as id, i.name as name, di.amount as amount, di.unit as unit
     from drink_ingredients di
     join ingredients i on i.id = di.ingredient_id
     where di.drink_id = ?
     order by di.rowid asc`,
    [id],
  );

  const favorite = db.first<{ drink_id: string }>(
    `select drink_id
     from favorites
     where drink_id = ?
       and deleted = 0
       and (
         (? is null and user_id is null)
         or user_id = ?
       )`,
    [id, viewerUserId, viewerUserId],
  );

  return {
    ...toListItem(row),
    description: row.description,
    steps: parseSteps(row.steps_json),
    ingredients,
    isFavorite: favorite !== null,
  };
}

export function listIngredientsIn(db: SqlDb): Ingredient[] {
  return db
    .all<IngredientRow>("select id, name, category from ingredients order by name asc")
    .map((row) => ({
      id: row.id,
      name: row.name,
      category: ingredientCategory(row.category),
    }));
}

export function listVisibleFavoritesIn(db: SqlDb, viewerUserId: string | null): DrinkListItem[] {
  return db
    .all<DrinkRow>(
      `select d.id, d.name, d.category, d.alcoholic
       from favorites f
       join drinks d on d.id = f.drink_id
       where f.deleted = 0
         and (
           (? is null and f.user_id is null)
           or f.user_id = ?
         )
       order by f.updated_at desc`,
      [viewerUserId, viewerUserId],
    )
    .map(toListItem);
}
