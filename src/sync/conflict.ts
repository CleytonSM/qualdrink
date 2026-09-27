export type FavoriteConflictInput = {
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  pendingSync: boolean;
};

export type StoredFavorite = {
  drinkId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  pendingSync: boolean;
  deleted: boolean;
};

export type RemoteFavorite = {
  drinkId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export function resolveFavoriteConflict(
  input: FavoriteConflictInput,
): "keep-local" | "apply-remote" {
  if (input.pendingSync && input.localUpdatedAt > input.remoteUpdatedAt) {
    return "keep-local";
  }
  return "apply-remote";
}

export function mergePulledFavorite(
  local: StoredFavorite | null,
  remote: RemoteFavorite,
): StoredFavorite {
  if (
    local &&
    resolveFavoriteConflict({
      localUpdatedAt: local.updatedAt,
      remoteUpdatedAt: remote.updatedAt,
      pendingSync: local.pendingSync,
    }) === "keep-local"
  ) {
    return local;
  }

  return {
    drinkId: remote.drinkId,
    userId: remote.userId,
    createdAt: remote.createdAt,
    updatedAt: remote.updatedAt,
    pendingSync: false,
    deleted: remote.deletedAt !== null,
  };
}
