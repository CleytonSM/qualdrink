import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { claimAnonymousFavoritesIn, setFavoriteIn } from "./favorites";
import {
  getDrinkIn,
  identifyDrinksIn,
  listVisibleFavoritesIn,
  readViewerUserId,
  searchDrinksIn,
  type SqlWriteDb,
} from "./reads";
import { insertCatalog, schemaSql, type SqlBind } from "./schema";

type FavoriteRow = {
  drink_id: string;
  user_id: string | null;
  created_at: number;
  updated_at: number;
  pending_sync: number;
  deleted: number;
};

function openCatalog(): SqlWriteDb {
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
    run(sql, params = []) {
      const statement = database.prepare(sql);
      if (params.length === 0) {
        statement.run();
        return;
      }
      statement.run(...params);
    },
  };
}

function favoriteRow(db: SqlWriteDb, drinkId: string): FavoriteRow | null {
  return db.first<FavoriteRow>("select * from favorites where drink_id = ?", [drinkId]);
}

test("favoritar anônimo grava uma linha visível e a receita reflete", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  setFavoriteIn(db, "caipirinha", true, null, 1_100);

  const row = favoriteRow(db, "caipirinha");
  assert.equal(row?.user_id, null);
  assert.equal(row?.created_at, 1_000);
  assert.equal(row?.updated_at, 1_100);
  assert.equal(row?.pending_sync, 1);
  assert.equal(row?.deleted, 0);
  assert.equal(
    db.first<{ count: number }>("select count(*) as count from favorites")?.count,
    1,
  );
  assert.deepEqual(
    listVisibleFavoritesIn(db, null).map((drink) => drink.id),
    ["caipirinha"],
  );
  assert.equal(getDrinkIn(db, "caipirinha", null)?.isFavorite, true);
});

test("desfavoritar grava tombstone e não cria linha inexistente", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", false, null, 500);
  assert.equal(favoriteRow(db, "caipirinha"), null);

  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  setFavoriteIn(db, "caipirinha", false, null, 2_000);

  const row = favoriteRow(db, "caipirinha");
  assert.equal(row?.created_at, 1_000);
  assert.equal(row?.updated_at, 2_000);
  assert.equal(row?.pending_sync, 1);
  assert.equal(row?.deleted, 1);
  assert.equal(row?.user_id, null);
  assert.deepEqual(listVisibleFavoritesIn(db, null), []);
  assert.equal(getDrinkIn(db, "caipirinha", null)?.isFavorite, false);
});

test("reativar preserva created_at e a lista segue updated_at decrescente", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  setFavoriteIn(db, "negroni", true, null, 2_000);
  setFavoriteIn(db, "caipirinha", false, null, 3_000);
  setFavoriteIn(db, "caipirinha", true, null, 4_000);

  const row = favoriteRow(db, "caipirinha");
  assert.equal(row?.created_at, 1_000);
  assert.equal(row?.updated_at, 4_000);
  assert.equal(row?.deleted, 0);
  assert.deepEqual(
    listVisibleFavoritesIn(db, null).map((drink) => drink.id),
    ["caipirinha", "negroni"],
  );
});

test("sem sessão o leitor é last_user_id e o favorito novo fica nessa conta", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  claimAnonymousFavoritesIn(db, "conta-a");

  assert.equal(readViewerUserId(db), "conta-a");
  assert.equal(favoriteRow(db, "caipirinha")?.user_id, "conta-a");
  assert.equal(favoriteRow(db, "caipirinha")?.pending_sync, 1);

  setFavoriteIn(db, "mojito", true, readViewerUserId(db), 2_000);
  const mojito = favoriteRow(db, "mojito");
  assert.equal(mojito?.user_id, "conta-a");
  assert.equal(mojito?.pending_sync, 1);
  assert.deepEqual(
    listVisibleFavoritesIn(db, readViewerUserId(db)).map((drink) => drink.id),
    ["mojito", "caipirinha"],
  );
  assert.deepEqual(listVisibleFavoritesIn(db, null), []);
});

test("claim não reatribui favorito de outra conta", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  setFavoriteIn(db, "caipirinha", false, null, 1_500);
  setFavoriteIn(db, "negroni", true, "conta-a", 2_000);

  claimAnonymousFavoritesIn(db, "conta-b");

  const caipirinha = favoriteRow(db, "caipirinha");
  assert.equal(caipirinha?.user_id, "conta-b");
  assert.equal(caipirinha?.deleted, 1);
  assert.equal(caipirinha?.pending_sync, 1);
  assert.equal(favoriteRow(db, "negroni")?.user_id, "conta-a");
  assert.equal(favoriteRow(db, "negroni")?.updated_at, 2_000);
  assert.deepEqual(
    listVisibleFavoritesIn(db, "conta-a").map((drink) => drink.id),
    ["negroni"],
  );
  assert.deepEqual(listVisibleFavoritesIn(db, "conta-b"), []);
  assert.equal(readViewerUserId(db), "conta-b");
});

test("busca e identificação seguem depois de favoritar", () => {
  const db = openCatalog();
  setFavoriteIn(db, "caipirinha", true, null, 1_000);
  assert.deepEqual(
    searchDrinksIn(db, "suica").map((drink) => drink.id),
    ["limonada_suica"],
  );
  const hits = identifyDrinksIn(db, ["cachaca", "limao", "acucar", "gelo"]);
  assert.equal(hits[0]?.id, "caipirinha");
  assert.equal(hits[0]?.coveragePercent, 100);
});
