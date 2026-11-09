/**
 * Seleção da identificação. Vive só em memória: trocar de aba não apaga,
 * encerrar o processo descarta.
 */
let selectedIds: string[] = [];
const listeners = new Set<() => void>();

export function getSelectedIngredientIds(): readonly string[] {
  return selectedIds;
}

export function toggleIngredient(id: string): void {
  selectedIds = selectedIds.includes(id)
    ? selectedIds.filter((item) => item !== id)
    : [...selectedIds, id];
  for (const listener of listeners) {
    listener();
  }
}

export function clearSelection(): void {
  if (selectedIds.length === 0) {
    return;
  }
  selectedIds = [];
  for (const listener of listeners) {
    listener();
  }
}

/** A revisão da foto só altera a seleção quando a pessoa confirma. */
export function addIngredients(ids: readonly string[]): void {
  const next = [...new Set([...selectedIds, ...ids])];
  if (next.length === selectedIds.length) return;
  selectedIds = next;
  for (const listener of listeners) listener();
}

export function subscribeSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
