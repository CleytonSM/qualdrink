import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { validateCredentials, PASSWORD_TOO_SHORT } from "../src/auth/credentials";
import { claimAnonymousFavoritesIn, setFavoriteIn } from "../src/db/favorites";
import {
  getDrinkIn,
  identifyDrinksIn,
  listVisibleFavoritesIn,
  searchDrinksIn,
  type SqlWriteDb,
} from "../src/db/reads";
import { insertCatalog, schemaSql, type SqlBind } from "../src/db/schema";
import { drinks, drinkIngredients, ingredients } from "../src/data/seed";
import { mergePulledFavorite, type RemoteFavorite } from "../src/sync/conflict";

type Check = { id: string; ok: boolean; detail: string };

const checks: Check[] = [];

function record(id: string, ok: boolean, detail: string): void {
  checks.push({ id, ok, detail });
}

function loadEnv(): { url: string; key: string } {
  const values = new Map<string, string>();
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index <= 0) {
      continue;
    }
    values.set(trimmed.slice(0, index), trimmed.slice(index + 1).trim());
  }
  return {
    url: values.get("EXPO_PUBLIC_SUPABASE_URL") ?? "",
    key: values.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? "",
  };
}

function openFileDb(path: string): { database: DatabaseSync; db: SqlWriteDb } {
  const database = new DatabaseSync(path);
  database.exec(schemaSql);
  const count = database.prepare("select count(*) as count from drinks").get() as { count: number };
  if (count.count === 0) {
    insertCatalog((sql, params) => {
      database.prepare(sql).run(...(params as SqlBind[]));
    });
  }
  const db: SqlWriteDb = {
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
  return { database, db };
}

function localRoteiro(): void {
  const path = join(mkdtempSync(join(tmpdir(), "qualdrink-aceite-")), "qualdrink.db");
  const first = openFileDb(path);
  const names = searchDrinksIn(first.db, "").map((drink) => drink.name);
  record(
    "AC-001",
    names.length === 14 && names.includes("Caipirinha") && names.includes("Limonada suíça"),
    `${names.length} drinks no primeiro lançamento`,
  );
  record(
    "AC-002",
    searchDrinksIn(first.db, "gin").some((drink) => drink.name === "Gin tônica") &&
      searchDrinksIn(first.db, "suica").some((drink) => drink.name === "Limonada suíça") &&
      searchDrinksIn(first.db, "xyz").length === 0,
    "gin, suica e xyz",
  );
  record("AC-003", identifyDrinksIn(first.db, []).length === 0, "identificação sem marcas");
  const full = identifyDrinksIn(first.db, ["cachaca", "limao", "acucar", "gelo"]);
  record(
    "AC-004",
    full[0]?.id === "caipirinha" &&
      full[0].matched === 4 &&
      full[0].total === 4 &&
      full[0].coveragePercent === 100,
    full[0] ? `${full[0].id} ${full[0].matched} de ${full[0].total}` : "sem resultado",
  );
  const partial = identifyDrinksIn(first.db, ["limao", "acucar"]);
  const caipirinha = partial.findIndex((hit) => hit.id === "caipirinha");
  const gin = partial.findIndex((hit) => hit.id === "gin_tonica");
  record(
    "AC-005",
    caipirinha >= 0 && gin >= 0 && caipirinha < gin,
    `caipirinha ${caipirinha}, gin tônica ${gin}`,
  );
  const recipe = getDrinkIn(first.db, "caipirinha", null);
  record(
    "AC-006-receita",
    recipe !== null &&
      recipe.ingredients.map((item) => `${item.amount} ${item.unit}`).join(" | ") ===
        "50 ml | 1 unidade | 2 colher de chá | 1 copo",
    "doses da caipirinha",
  );
  setFavoriteIn(first.db, "caipirinha", true, null, 1_700_000_000_000);
  first.database.close();

  const reopened = openFileDb(path);
  const visible = listVisibleFavoritesIn(reopened.db, null).map((drink) => drink.id);
  record("AC-006", visible.length === 1 && visible[0] === "caipirinha", "favorito após reabrir o arquivo");
  record(
    "AC-010",
    searchDrinksIn(reopened.db, "suica").length === 1 &&
      identifyDrinksIn(reopened.db, ["gelo"]).length > 0 &&
      getDrinkIn(reopened.db, "caipirinha", null)?.isFavorite === true,
    "busca, identificação e favorito sem rede",
  );
  record(
    "AC-011",
    validateCredentials("pessoa@example.com", "123") === PASSWORD_TOO_SHORT,
    PASSWORD_TOO_SHORT,
  );

  const userId = "11111111-1111-1111-1111-111111111111";
  claimAnonymousFavoritesIn(reopened.db, userId);
  const claimed = reopened.db.first<{ user_id: string; pending_sync: number; deleted: number }>(
    "select user_id, pending_sync, deleted from favorites where drink_id = ?",
    ["caipirinha"],
  );
  record(
    "AC-007-local",
    claimed?.user_id === userId && claimed.pending_sync === 1 && claimed.deleted === 0,
    "favorito anônimo reivindicado para a conta",
  );

  const secondPath = join(mkdtempSync(join(tmpdir(), "qualdrink-aceite-b-")), "qualdrink.db");
  const second = openFileDb(secondPath);
  const remote: RemoteFavorite = {
    drinkId: "caipirinha",
    userId,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    deletedAt: null,
  };
  const pulled = mergePulledFavorite(null, remote);
  second.db.run(
    `insert into favorites (drink_id, user_id, created_at, updated_at, pending_sync, deleted)
     values (?, ?, ?, ?, ?, ?)`,
    [
      pulled.drinkId,
      pulled.userId,
      pulled.createdAt,
      pulled.updatedAt,
      pulled.pendingSync ? 1 : 0,
      pulled.deleted ? 1 : 0,
    ],
  );
  second.db.run(
    `insert into local_meta (key, value) values (?, ?)
     on conflict(key) do update set value = excluded.value`,
    ["last_user_id", userId],
  );
  record(
    "AC-008",
    listVisibleFavoritesIn(second.db, userId).some((drink) => drink.id === "caipirinha"),
    "caipirinha visível no segundo aparelho após o pull",
  );

  setFavoriteIn(reopened.db, "caipirinha", false, userId, 1_700_000_000_500);
  const tombstone = mergePulledFavorite(
    {
      drinkId: "caipirinha",
      userId,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      pendingSync: false,
      deleted: false,
    },
    {
      drinkId: "caipirinha",
      userId,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_500,
      deletedAt: 1_700_000_000_500,
    },
  );
  second.db.run(
    `update favorites set updated_at = ?, pending_sync = ?, deleted = ? where drink_id = ?`,
    [tombstone.updatedAt, tombstone.pendingSync ? 1 : 0, tombstone.deleted ? 1 : 0, "caipirinha"],
  );
  record(
    "AC-009-local",
    listVisibleFavoritesIn(reopened.db, userId).length === 0 &&
      listVisibleFavoritesIn(second.db, userId).length === 0 &&
      tombstone.deleted,
    "lista local sem a caipirinha depois do tombstone",
  );
  reopened.database.close();
  second.database.close();
}

async function expectWriteRejected(
  client: SupabaseClient,
  table: "ingredients" | "drinks" | "drink_ingredients",
  row: Record<string, string | boolean>,
): Promise<void> {
  const { error } = await client.from(table).insert(row);
  record(`AC-013-${table}`, error !== null, error ? error.code : "insert aceito");
}

async function remoteRoteiro(url: string, key: string): Promise<{ email: string; userId: string }> {
  record(
    "SEC-001",
    key.startsWith("sb_publishable_") && !key.toLowerCase().includes("service_role"),
    "chave publishable, sem service role",
  );
  const host = new URL(url).host;
  record("INF-001", host === "yyhxqasurvmaxeqrxffu.supabase.co", host);

  const email = `qualdrink.aceite.${Date.now()}@gmail.com`;
  const password = `A1${randomBytes(12).toString("base64url")}`;
  const first = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedUp = await first.auth.signUp({ email, password });
  const userId = signedUp.data.session?.user.id ?? "";
  record(
    "CON-007",
    signedUp.error === null && userId.length > 0,
    signedUp.error?.message ?? (userId ? "sessão imediata" : "cadastro sem sessão"),
  );
  if (!userId) {
    return { email, userId };
  }

  await expectWriteRejected(first, "drinks", {
    id: "aceite_probe",
    name: "Probe",
    name_folded: "probe",
    category: "classico",
    description: "não deve gravar",
    steps_json: "[]",
    alcoholic: true,
  });
  await expectWriteRejected(first, "ingredients", {
    id: "aceite_probe",
    name: "Probe",
    name_folded: "probe",
    category: "outro",
  });
  await expectWriteRejected(first, "drink_ingredients", {
    drink_id: "caipirinha",
    ingredient_id: "cachaca",
    amount: "1",
    unit: "ml",
  });

  const catalog = await first.from("drinks").select("id, name, name_folded, category, description, steps_json, alcoholic");
  record("CAT-drinks", catalog.error === null && catalog.data?.length === drinks.length, catalog.error?.code ?? `${catalog.data?.length ?? 0} drinks`);
  const remoteIngredients = await first.from("ingredients").select("id, name, category");
  record(
    "CAT-ingredients",
    remoteIngredients.error === null && remoteIngredients.data?.length === ingredients.length,
    remoteIngredients.error?.code ?? `${remoteIngredients.data?.length ?? 0} ingredientes`,
  );
  const remoteDoses = await first.from("drink_ingredients").select("drink_id, ingredient_id, amount, unit");
  record(
    "CAT-doses",
    remoteDoses.error === null && remoteDoses.data?.length === drinkIngredients.length,
    remoteDoses.error?.code ?? `${remoteDoses.data?.length ?? 0} doses`,
  );

  const createdAt = new Date(1_700_000_000_000).toISOString();
  const pushed = await first.from("favorites").upsert(
    {
      user_id: userId,
      drink_id: "caipirinha",
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    { onConflict: "user_id,drink_id" },
  );
  record("AC-007", pushed.error === null, pushed.error?.code ?? "favorito remoto com deleted_at nulo");

  const foreign = await first.from("favorites").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    drink_id: "caipirinha",
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  });
  record("SEC-002", foreign.error !== null, foreign.error?.code ?? "insert de outro user_id aceito");

  const second = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await second.auth.signInWithPassword({ email, password });
  const pulled = await second
    .from("favorites")
    .select("user_id, drink_id, created_at, updated_at, deleted_at")
    .eq("drink_id", "caipirinha");
  const row = pulled.data?.[0];
  record(
    "AC-008-remoto",
    signedIn.error === null && row?.user_id === userId && row.deleted_at === null,
    pulled.error?.code ?? (row ? "caipirinha na segunda sessão" : "linha ausente"),
  );

  const updatedAt = new Date(1_700_000_000_500).toISOString();
  const tombstone = await first.from("favorites").upsert(
    {
      user_id: userId,
      drink_id: "caipirinha",
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: updatedAt,
    },
    { onConflict: "user_id,drink_id" },
  );
  const after = await second
    .from("favorites")
    .select("deleted_at")
    .eq("drink_id", "caipirinha")
    .single();
  record(
    "AC-009",
    tombstone.error === null && after.data?.deleted_at !== null && after.data?.deleted_at !== undefined,
    after.error?.code ?? "deleted_at preenchido",
  );

  await first.auth.signOut();
  await second.auth.signOut();
  return { email, userId };
}

async function main(): Promise<void> {
  localRoteiro();
  const env = loadEnv();
  const remote = await remoteRoteiro(env.url, env.key);
  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ email: remote.email, userId: remote.userId, failed: failed.length, checks }, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "falha";
  console.log(JSON.stringify({ failed: message, checks }, null, 2));
  process.exitCode = 1;
});
