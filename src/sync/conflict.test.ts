import assert from "node:assert/strict";
import { test } from "node:test";

import { mergePulledFavorite, resolveFavoriteConflict, type StoredFavorite } from "./conflict";

function localFavorite(updatedAt: number, pendingSync: boolean): StoredFavorite {
  return {
    drinkId: "caipirinha",
    userId: "conta-a",
    createdAt: 50,
    updatedAt,
    pendingSync,
    deleted: false,
  };
}

test("conflito local mais novo mantém o local", () => {
  assert.equal(
    resolveFavoriteConflict({
      localUpdatedAt: 200,
      remoteUpdatedAt: 100,
      pendingSync: true,
    }),
    "keep-local",
  );

  const local = localFavorite(200, true);
  assert.equal(
    mergePulledFavorite(local, {
      drinkId: "caipirinha",
      userId: "conta-a",
      createdAt: 50,
      updatedAt: 100,
      deletedAt: null,
    }),
    local,
  );
});

test("conflito remoto mais novo aplica o remoto e zera a pendência", () => {
  assert.equal(
    resolveFavoriteConflict({
      localUpdatedAt: 100,
      remoteUpdatedAt: 200,
      pendingSync: true,
    }),
    "apply-remote",
  );

  const next = mergePulledFavorite(localFavorite(100, true), {
    drinkId: "caipirinha",
    userId: "conta-a",
    createdAt: 40,
    updatedAt: 200,
    deletedAt: null,
  });
  assert.equal(next.pendingSync, false);
  assert.equal(next.updatedAt, 200);
  assert.equal(next.createdAt, 40);
  assert.equal(next.deleted, false);
});

test("empate aplica o remoto", () => {
  assert.equal(
    resolveFavoriteConflict({
      localUpdatedAt: 100,
      remoteUpdatedAt: 100,
      pendingSync: false,
    }),
    "apply-remote",
  );

  const next = mergePulledFavorite(localFavorite(100, false), {
    drinkId: "caipirinha",
    userId: "conta-a",
    createdAt: 100,
    updatedAt: 100,
    deletedAt: 100,
  });
  assert.equal(next.pendingSync, false);
  assert.equal(next.deleted, true);
  assert.equal(next.updatedAt, 100);
});

test("pendência empatada também aplica o remoto", () => {
  assert.equal(
    resolveFavoriteConflict({
      localUpdatedAt: 100,
      remoteUpdatedAt: 100,
      pendingSync: true,
    }),
    "apply-remote",
  );
});

test("sem pendência o remoto substitui mesmo se o relógio local for maior", () => {
  assert.equal(
    resolveFavoriteConflict({
      localUpdatedAt: 200,
      remoteUpdatedAt: 100,
      pendingSync: false,
    }),
    "apply-remote",
  );
});

test("linha remota nova entra sem pendência", () => {
  const next = mergePulledFavorite(null, {
    drinkId: "caipirinha",
    userId: "conta-a",
    createdAt: 10,
    updatedAt: 20,
    deletedAt: null,
  });
  assert.equal(next.pendingSync, false);
  assert.equal(next.deleted, false);
  assert.equal(next.userId, "conta-a");
});
