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

export function subscribeSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
