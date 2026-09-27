import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { insertCatalog, schemaSql, type SqlBind } from "./schema";
import {
  getDrinkIn,
  identifyDrinksIn,
  listVisibleFavoritesIn,
  searchDrinksIn,
  type SqlDb,
} from "./reads";

function openCatalog(): SqlDb {
  const database = new DatabaseSync(":memory:");
  database.exec(schemaSql);
  insertCatalog((sql, params) => {
    database.prepare(sql).run(...(params as SqlBind[]));
  });

  return {
    all(sql, params = []) {
      const statement = database.prepare(sql);
      return (params.length === 0 ? statement.all() : statement.all(...params)) as never[];
    },
    first(sql, params = []) {
      const statement = database.prepare(sql);
      const row = params.length === 0 ? statement.get() : statement.get(...params);
      return (row ?? null) as never;
    },
  };
}

test("busca vazia devolve os 14 drinks", () => {
  const drinks = searchDrinksIn(openCatalog(), "   ");
  assert.equal(drinks.length, 14);
  assert.ok(drinks.some((drink) => drink.name === "Caipirinha"));
  assert.ok(drinks.some((drink) => drink.name === "Limonada suíça"));
  const names = drinks.map((drink) => drink.name);
  assert.deepEqual(names, [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
});

test("busca ignora maiúsculas e acentos", () => {
  const db = openCatalog();
  assert.deepEqual(
    searchDrinksIn(db, "gin").map((drink) => drink.id),
    ["gin_tonica"],
  );
  assert.deepEqual(
    searchDrinksIn(db, "suica").map((drink) => drink.id),
    ["limonada_suica"],
  );
  assert.deepEqual(
    searchDrinksIn(db, "  NEGRONI ").map((drink) => drink.id),
    ["negroni"],
  );
  assert.deepEqual(
    searchDrinksIn(db, "mojito").map((drink) => drink.id),
    ["mojito", "mojito_sem_alcool"],
  );
  assert.deepEqual(
    searchDrinksIn(db, "pina").map((drink) => drink.id),
    ["pina_colada"],
  );
  assert.equal(searchDrinksIn(db, "pinha").length, 0);
  assert.equal(searchDrinksIn(db, "xyz").length, 0);
  assert.equal(searchDrinksIn(db, "caipirinha")[0]?.alcoholic, true);
  assert.equal(searchDrinksIn(db, "limonada")[0]?.alcoholic, false);
});

test("caipirinha completa fica em primeiro com 4 de 4", () => {
  const hits = identifyDrinksIn(openCatalog(), ["cachaca", "limao", "acucar", "gelo"]);
  assert.equal(hits[0]?.id, "caipirinha");
  assert.equal(hits[0]?.matched, 4);
  assert.equal(hits[0]?.total, 4);
  assert.equal(hits[0]?.coveragePercent, 100);
});

test("limão e açúcar colocam caipirinha acima de gin tônica", () => {
  const hits = identifyDrinksIn(openCatalog(), ["limao", "acucar"]);
  const caipirinha = hits.findIndex((hit) => hit.id === "caipirinha");
  const gin = hits.findIndex((hit) => hit.id === "gin_tonica");
  assert.ok(caipirinha >= 0);
  assert.ok(gin >= 0);
  assert.ok(caipirinha < gin);
  assert.equal(hits[caipirinha]?.coveragePercent, 50);
  assert.equal(hits[gin]?.matched, 1);
  assert.equal(hits[gin]?.total, 4);
});

test("laranja sozinha não encontra drink", () => {
  assert.equal(identifyDrinksIn(openCatalog(), ["laranja"]).length, 0);
});

test("identificação sem seleção não consulta cobertura", () => {
  assert.deepEqual(identifyDrinksIn(openCatalog(), []), []);
});

test("id de ingrediente não entra concatenado no SQL", () => {
  const db = openCatalog();
  const hits = identifyDrinksIn(db, ["limao'); drop table drinks;--"]);
  assert.equal(hits.length, 0);
  assert.equal(searchDrinksIn(db, "").length, 14);
});

test("receita da caipirinha e drink inexistente", () => {
  const db = openCatalog();
  const drink = getDrinkIn(db, "caipirinha", null);
  if (!drink) {
    throw new Error("Caipirinha ausente do catálogo");
  }
  assert.equal(drink.isFavorite, false);
  assert.deepEqual(
    drink.ingredients.map((item) => `${item.amount} ${item.unit}`),
    ["50 ml", "1 unidade", "2 colher de chá", "1 copo"],
  );
  assert.equal(drink.steps.length, 3);
  assert.equal(getDrinkIn(db, "nao-existe", null), null);
  assert.deepEqual(listVisibleFavoritesIn(db, null), []);
});
