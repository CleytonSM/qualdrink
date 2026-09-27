import { getDatabase, asSqlDb } from "@/src/db/client";
import { claimAnonymousFavoritesIn, setFavoriteIn } from "@/src/db/favorites";
import { readMeta } from "@/src/db/meta";
import {
  getDrinkIn,
  identifyDrinksIn,
  listIngredientsIn,
  listVisibleFavoritesIn,
  readViewerUserId,
  searchDrinksIn,
} from "@/src/db/reads";
import type { DrinkDetail, DrinkListItem, IdentifyHit, Ingredient } from "@/src/db/types";

export type SyncStatus =
  | { kind: "never" }
  | { kind: "ok"; syncedAt: number }
  | { kind: "error"; message: string };

function database() {
  return asSqlDb(getDatabase());
}

export function getViewerUserId(): string | null {
  return readViewerUserId(database());
}

export function searchDrinks(term: string): DrinkListItem[] {
  return searchDrinksIn(database(), term);
}

export function identifyDrinks(ingredientIds: readonly string[]): IdentifyHit[] {
  return identifyDrinksIn(database(), ingredientIds);
}

export function getDrink(id: string): DrinkDetail | null {
  const db = database();
  return getDrinkIn(db, id, readViewerUserId(db));
}

export function listIngredients(): Ingredient[] {
  return listIngredientsIn(database());
}

export function listVisibleFavorites(viewerUserId: string | null): DrinkListItem[] {
  return listVisibleFavoritesIn(database(), viewerUserId);
}

export function setFavorite(
  drinkId: string,
  favorite: boolean,
  viewerUserId: string | null,
): void {
  setFavoriteIn(database(), drinkId, favorite, viewerUserId, Date.now());
}

export function claimAnonymousFavorites(userId: string): void {
  const opened = getDatabase();
  opened.withTransactionSync(() => {
    claimAnonymousFavoritesIn(asSqlDb(opened), userId);
  });
}

export function readSyncStatus(): SyncStatus {
  const db = database();
  const message = readMeta(db, "last_sync_error");
  if (message) {
    return { kind: "error", message };
  }
  const raw = readMeta(db, "last_sync_at");
  if (!raw) {
    return { kind: "never" };
  }
  const syncedAt = Number(raw);
  if (!Number.isFinite(syncedAt)) {
    return { kind: "never" };
  }
  return { kind: "ok", syncedAt };
}
