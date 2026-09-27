import type { SqlDb, SqlWriteDb } from "@/src/db/reads";

export function readMeta(db: SqlDb, key: string): string | null {
  const row = db.first<{ value: string }>("select value from local_meta where key = ?", [key]);
  return row?.value ?? null;
}

export function writeMeta(db: SqlWriteDb, key: string, value: string): void {
  db.run(
    `insert into local_meta (key, value) values (?, ?)
     on conflict(key) do update set value = excluded.value`,
    [key, value],
  );
}

export function deleteMeta(db: SqlWriteDb, key: string): void {
  db.run("delete from local_meta where key = ?", [key]);
}
