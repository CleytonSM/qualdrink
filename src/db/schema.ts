import { foldName } from "@/src/data/fold";
import { assertSeed, drinkIngredients, drinks, ingredients } from "@/src/data/seed";

export type SqlBind = string | number | null;

export const schemaSql = `
create table if not exists ingredients (
  id text primary key not null,
  name text not null,
  name_folded text not null,
  category text not null
);

create table if not exists drinks (
  id text primary key not null,
  name text not null,
  name_folded text not null,
  category text not null,
  description text not null,
  steps_json text not null,
  alcoholic integer not null
);

create table if not exists drink_ingredients (
  drink_id text not null,
  ingredient_id text not null,
  amount text not null,
  unit text not null,
  primary key (drink_id, ingredient_id)
);

create table if not exists favorites (
  drink_id text primary key not null,
  user_id text,
  created_at integer not null,
  updated_at integer not null,
  pending_sync integer not null,
  deleted integer not null
);

create table if not exists local_meta (
  key text primary key not null,
  value text not null
);

create index if not exists drink_ingredients_ingredient_idx
  on drink_ingredients (ingredient_id);
create index if not exists drinks_name_folded_idx
  on drinks (name_folded);
`;

export function insertCatalog(run: (sql: string, params: readonly SqlBind[]) => void): void {
  assertSeed();

  for (const ingredient of ingredients) {
    run("insert into ingredients (id, name, name_folded, category) values (?, ?, ?, ?)", [
      ingredient.id,
      ingredient.name,
      foldName(ingredient.name),
      ingredient.category,
    ]);
  }

  for (const drink of drinks) {
    run(
      `insert into drinks (
        id, name, name_folded, category, description, steps_json, alcoholic
      ) values (?, ?, ?, ?, ?, ?, ?)`,
      [
        drink.id,
        drink.name,
        foldName(drink.name),
        drink.category,
        drink.description,
        JSON.stringify(drink.steps),
        drink.alcoholic ? 1 : 0,
      ],
    );
  }

  for (const dose of drinkIngredients) {
    run(
      "insert into drink_ingredients (drink_id, ingredient_id, amount, unit) values (?, ?, ?, ?)",
      [dose.drinkId, dose.ingredientId, dose.amount, dose.unit],
    );
  }
}
