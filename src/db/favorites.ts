import type { SqlWriteDb } from "@/src/db/reads";

export function setFavoriteIn(
  db: SqlWriteDb,
  drinkId: string,
  favorite: boolean,
  viewerUserId: string | null,
  now: number,
): void {
  if (favorite) {
    db.run(
      `insert into favorites (drink_id, user_id, created_at, updated_at, pending_sync, deleted)
       values (?, ?, ?, ?, 1, 0)
       on conflict(drink_id) do update set
         user_id = excluded.user_id,
         updated_at = excluded.updated_at,
         pending_sync = 1,
         deleted = 0`,
      [drinkId, viewerUserId, now, now],
    );
    return;
  }

  db.run(
    `update favorites
     set deleted = 1, pending_sync = 1, updated_at = ?
     where drink_id = ?`,
    [now, drinkId],
  );
}

export function claimAnonymousFavoritesIn(db: SqlWriteDb, userId: string): void {
  db.run("update favorites set user_id = ?, pending_sync = 1 where user_id is null", [userId]);
  db.run(
    `insert into local_meta (key, value) values (?, ?)
     on conflict(key) do update set value = excluded.value`,
    ["last_user_id", userId],
  );
}
