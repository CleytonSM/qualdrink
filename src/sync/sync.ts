import { getDatabase, asSqlDb } from "@/src/db/client";
import { deleteMeta, writeMeta } from "@/src/db/meta";
import { claimAnonymousFavorites } from "@/src/db/queries";
import type { SqlWriteDb } from "@/src/db/reads";
import { getSessionUserId, getSupabase } from "@/src/supabase/client";
import {
  mergePulledFavorite,
  type RemoteFavorite,
  type StoredFavorite,
} from "@/src/sync/conflict";

export const SYNC_FAILURE_MESSAGE = "Não sincronizado. Tente de novo.";
export const SYNC_SIGNED_OUT_MESSAGE = "Entre na conta para sincronizar.";

export type SyncResult = { ok: true; syncedAt: number } | { ok: false; message: string };

type PendingRow = {
  drink_id: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  pending_sync: number;
  deleted: number;
};

type LocalFavoriteRow = PendingRow & {
  user_id: string | null;
};

const ingredientCategories = new Set([
  "destilado",
  "citrico",
  "mixer",
  "adocante",
  "fruta",
  "outro",
]);

const drinkCategories = new Set(["brasileiro", "classico", "sem_alcool"]);

const listeners = new Set<() => void>();
let queue: Promise<void> = Promise.resolve();

export function subscribeDataChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

function failSync(): SyncResult {
  const opened = getDatabase();
  opened.withTransactionSync(() => {
    writeMeta(asSqlDb(opened), "last_sync_error", SYNC_FAILURE_MESSAGE);
  });
  return { ok: false, message: SYNC_FAILURE_MESSAGE };
}

function succeedSync(syncedAt: number): SyncResult {
  const opened = getDatabase();
  opened.withTransactionSync(() => {
    const db = asSqlDb(opened);
    writeMeta(db, "last_sync_at", String(syncedAt));
    deleteMeta(db, "last_sync_error");
  });
  return { ok: true, syncedAt };
}

function asRecords(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) {
    throw new Error("sync failed");
  }
  return data.map((row) => {
    if (typeof row !== "object" || row === null) {
      throw new Error("sync failed");
    }
    return row as Record<string, unknown>;
  });
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("sync failed");
  }
  return value;
}

function epochFromRemote(value: unknown): number {
  if (typeof value !== "string") {
    throw new Error("sync failed");
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error("sync failed");
  }
  return parsed;
}

function deletedAtFromRemote(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  return epochFromRemote(value);
}

function toStored(row: LocalFavoriteRow): StoredFavorite | null {
  if (!row.user_id) {
    return null;
  }
  return {
    drinkId: row.drink_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pendingSync: row.pending_sync === 1,
    deleted: row.deleted === 1,
  };
}

function upsertLocalFavorite(db: SqlWriteDb, row: StoredFavorite): void {
  db.run(
    `insert into favorites (drink_id, user_id, created_at, updated_at, pending_sync, deleted)
     values (?, ?, ?, ?, ?, ?)
     on conflict(drink_id) do update set
       user_id = excluded.user_id,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       pending_sync = excluded.pending_sync,
       deleted = excluded.deleted`,
    [
      row.drinkId,
      row.userId,
      row.createdAt,
      row.updatedAt,
      row.pendingSync ? 1 : 0,
      row.deleted ? 1 : 0,
    ],
  );
}

async function pushPending(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("sync failed");
  }
  const db = asSqlDb(getDatabase());
  const pending = db.all<PendingRow>(
    `select drink_id, user_id, created_at, updated_at, pending_sync, deleted
     from favorites
     where pending_sync = 1 and user_id = ?`,
    [userId],
  );

  for (const row of pending) {
    const { error } = await supabase.from("favorites").upsert(
      {
        user_id: userId,
        drink_id: row.drink_id,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
        deleted_at: row.deleted === 1 ? new Date(row.updated_at).toISOString() : null,
      },
      { onConflict: "user_id,drink_id" },
    );
    if (error) {
      throw new Error("sync failed");
    }
    asSqlDb(getDatabase()).run(
      `update favorites
       set pending_sync = 0
       where drink_id = ? and user_id = ? and updated_at = ? and pending_sync = 1`,
      [row.drink_id, userId, row.updated_at],
    );
  }
}

async function pullFavorites(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("sync failed");
  }
  const { data, error } = await supabase
    .from("favorites")
    .select("user_id, drink_id, created_at, updated_at, deleted_at")
    .eq("user_id", userId);
  if (error) {
    throw new Error("sync failed");
  }

  const remoteRows: RemoteFavorite[] = asRecords(data).map((row) => ({
    drinkId: readString(row, "drink_id"),
    userId: readString(row, "user_id"),
    createdAt: epochFromRemote(row.created_at),
    updatedAt: epochFromRemote(row.updated_at),
    deletedAt: deletedAtFromRemote(row.deleted_at),
  }));

  const opened = getDatabase();
  opened.withTransactionSync(() => {
    const db = asSqlDb(opened);
    for (const remote of remoteRows) {
      if (remote.userId !== userId) {
        throw new Error("sync failed");
      }
      const current = db.first<LocalFavoriteRow>(
        `select drink_id, user_id, created_at, updated_at, pending_sync, deleted
         from favorites
         where drink_id = ?`,
        [remote.drinkId],
      );
      const stored = current ? toStored(current) : null;
      const next = mergePulledFavorite(stored, remote);
      if (stored && stored === next) {
        continue;
      }
      upsertLocalFavorite(db, next);
    }
  });
}

function assertSteps(value: string): void {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((step) => typeof step !== "string")) {
    throw new Error("sync failed");
  }
}

async function pullCatalog(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("sync failed");
  }

  const ingredients = await supabase
    .from("ingredients")
    .select("id, name, name_folded, category");
  const drinks = await supabase
    .from("drinks")
    .select("id, name, name_folded, category, description, steps_json, alcoholic");
  const doses = await supabase
    .from("drink_ingredients")
    .select("drink_id, ingredient_id, amount, unit");

  if (ingredients.error || drinks.error || doses.error) {
    throw new Error("sync failed");
  }

  const ingredientRows = asRecords(ingredients.data).map((row) => {
    const category = readString(row, "category");
    if (!ingredientCategories.has(category)) {
      throw new Error("sync failed");
    }
    return {
      id: readString(row, "id"),
      name: readString(row, "name"),
      nameFolded: readString(row, "name_folded"),
      category,
    };
  });

  const drinkRows = asRecords(drinks.data).map((row) => {
    const category = readString(row, "category");
    const stepsJson = readString(row, "steps_json");
    if (!drinkCategories.has(category) || typeof row.alcoholic !== "boolean") {
      throw new Error("sync failed");
    }
    assertSteps(stepsJson);
    return {
      id: readString(row, "id"),
      name: readString(row, "name"),
      nameFolded: readString(row, "name_folded"),
      category,
      description: readString(row, "description"),
      stepsJson,
      alcoholic: row.alcoholic ? 1 : 0,
    };
  });

  const doseRows = asRecords(doses.data).map((row) => ({
    drinkId: readString(row, "drink_id"),
    ingredientId: readString(row, "ingredient_id"),
    amount: readString(row, "amount"),
    unit: readString(row, "unit"),
  }));

  const opened = getDatabase();
  opened.withTransactionSync(() => {
    const db = asSqlDb(opened);
    for (const row of ingredientRows) {
      db.run(
        `insert into ingredients (id, name, name_folded, category)
         values (?, ?, ?, ?)
         on conflict(id) do update set
           name = excluded.name,
           name_folded = excluded.name_folded,
           category = excluded.category`,
        [row.id, row.name, row.nameFolded, row.category],
      );
    }
    for (const row of drinkRows) {
      db.run(
        `insert into drinks (
           id, name, name_folded, category, description, steps_json, alcoholic
         ) values (?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           name = excluded.name,
           name_folded = excluded.name_folded,
           category = excluded.category,
           description = excluded.description,
           steps_json = excluded.steps_json,
           alcoholic = excluded.alcoholic`,
        [
          row.id,
          row.name,
          row.nameFolded,
          row.category,
          row.description,
          row.stepsJson,
          row.alcoholic,
        ],
      );
    }
    for (const row of doseRows) {
      db.run(
        `insert into drink_ingredients (drink_id, ingredient_id, amount, unit)
         values (?, ?, ?, ?)
         on conflict(drink_id, ingredient_id) do update set
           amount = excluded.amount,
           unit = excluded.unit`,
        [row.drinkId, row.ingredientId, row.amount, row.unit],
      );
    }
  });
}

async function runSync(userId: string): Promise<SyncResult> {
  const sessionUserId = await getSessionUserId();
  if (!getSupabase() || sessionUserId !== userId) {
    return { ok: false, message: SYNC_SIGNED_OUT_MESSAGE };
  }

  claimAnonymousFavorites(userId);

  try {
    await pushPending(userId);
  } catch {
    return failSync();
  }

  try {
    await pullFavorites(userId);
  } catch {
    return failSync();
  }

  try {
    await pullCatalog();
  } catch {
    return failSync();
  }

  return succeedSync(Date.now());
}

export function syncAll(userId: string): Promise<SyncResult> {
  const run = queue.then(() => runSync(userId), () => runSync(userId));
  queue = run.then(
    () => {
      notifyDataChanged();
    },
    () => {
      notifyDataChanged();
    },
  );
  return run;
}

export async function syncIfSession(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) {
    return;
  }
  await syncAll(userId);
}
