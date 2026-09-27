import * as SQLite from "expo-sqlite";

import { insertCatalog, schemaSql, type SqlBind } from "@/src/db/schema";
import type { SqlWriteDb } from "@/src/db/reads";

let database: SQLite.SQLiteDatabase | null = null;
let opening: Promise<void> | null = null;

function bind(params: readonly SqlBind[] = []): SqlBind[] {
  return [...params];
}

export function asSqlDb(opened: SQLite.SQLiteDatabase): SqlWriteDb {
  return {
    all<T>(sql: string, params?: readonly SqlBind[]): T[] {
      const values = bind(params);
      return values.length === 0 ? opened.getAllSync<T>(sql) : opened.getAllSync<T>(sql, values);
    },
    first<T>(sql: string, params?: readonly SqlBind[]): T | null {
      const values = bind(params);
      const row =
        values.length === 0 ? opened.getFirstSync<T>(sql) : opened.getFirstSync<T>(sql, values);
      return row ?? null;
    },
    run(sql: string, params?: readonly SqlBind[]): void {
      const values = bind(params);
      if (values.length === 0) {
        opened.runSync(sql);
        return;
      }
      opened.runSync(sql, values);
    },
  };
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error("Banco ainda não está pronto.");
  }
  return database;
}

export function ensureDatabase(): Promise<void> {
  if (database) {
    return Promise.resolve();
  }
  if (!opening) {
    opening = seedDatabase().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

async function seedDatabase(): Promise<void> {
  const opened = await SQLite.openDatabaseAsync("qualdrink.db");
  await opened.execAsync("PRAGMA journal_mode = WAL;");
  await opened.execAsync(schemaSql);

  const count = await opened.getFirstAsync<{ count: number }>(
    "select count(*) as count from drinks",
  );
  if (!count || count.count === 0) {
    const statements: Array<[string, readonly SqlBind[]]> = [];
    insertCatalog((sql, params) => {
      statements.push([sql, params]);
    });
    await opened.withTransactionAsync(async () => {
      for (const [sql, params] of statements) {
        await opened.runAsync(sql, bind(params));
      }
    });
  }

  await opened.runAsync("insert or ignore into local_meta (key, value) values (?, ?)", [
    "schema_version",
    "1",
  ]);

  database = opened;
}
