/**
 * Único módulo com hexadecimal.
 * app.json repete `background` na splash nativa, que não importa TypeScript.
 */
export const colors = {
  background: "#0E0C0B",
  surface: "#1A1614",
  surfaceRaised: "#26211C",
  text: "#F6F0E8",
  textMuted: "#A39890",
  border: "#342C28",
  accent: "#FF2E63",
  amber: "#F0B429",
  /** Âmbar translúcido para o enchimento de cobertura; mesma cor, não uma segunda paleta. */
  amberWash: "#F0B4291F",
} as const;

/** Cores dos ingredientes, compartilhadas pela ilustração e pela legenda. */
export const ingredientColors = {
  clear: "#C2DCD7", sugar: "#FFF2D6", ice: "#D0EDF3",
  lime: "#B9D96D", limeRind: "#72983E", mint: "#6CB88A", mintVein: "#C1E0A5",
  orange: "#F4A444", amber: "#DEA34C", red: "#E45D49", cranberry: "#C9506A",
  vermouth: "#A55645", cola: "#80503C", pineapple: "#E3CB71", cream: "#F0E4C7",
  glassEdge: "#C6DBCE70", glassShine: "#FFFFFF26",
  iceFill: "#D0EDF338", iceEdge: "#E4F7F490", bubble: "#F4F5D080",
} as const;
