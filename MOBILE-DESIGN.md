# QualDrink: design commitments

Source of product truth for color, type, copy, and routes: `spec/spec-architecture-qualdrink.md`.
This file records the App Read, Nav Read, and dials so later UI work stays on the same system.

```
APP READ: drink-recipe utility for someone who knows a bottle but not the drink, dark bar-menu language, leaning StyleSheet + existing tokens.
platforms: iOS first-class · Android first-class · web best-effort
posture: unified-brand
offline: N/A (local-first; SQLite paints the UI; sync never blocks a list)
```

```
NAV READ
platforms: iOS + Android first-class, web best-effort
tabs (4): Buscar · Identificar · Favoritos · Conta
app/
  (tabs)/
    index         Buscar        → push /drink/[id]
    identificar   Identificar   → push /drink/[id]
    favoritos     Favoritos     → push /drink/[id]
    conta         Conta         (auth and sync on this tab; browse-first, no (auth) group)
  drink/[id]                    push, covers the tab bar
entry points: Identificar ← empty search ("Identificar pelos ingredientes")
sheets: none (Identificar has an in-screen selection tray, not a sheet)
deep links: /drink/:id
android back: default pop; cold start on a drink replaces to Buscar
max taps to any core screen: 2
```

Dials: `DESIGN_EXPRESSION: 6` · `MOTION_INTENSITY: 5` · `VISUAL_DENSITY: 4`

Expression 6 brands the content and keeps the native tab bar. Motion 5 covers press feedback, the coverage fill, the tray entrance, and the glass pour. With reduced motion on, all of them snap to the final state.

## The language: a bar menu, not an app template

A printed bar menu lists a drink by name and what goes in it. It does not repeat the section on every line, and it does not put each drink in a box. Every screen follows that idea:

- Lists read like the menu: drink name in Fraunces, then its ingredients in the recipe order, joined by ` · `. Ice is left out of that line because every drink has it. The category is the section header, never repeated on each row.
- Section heads are sentence case in `text` with a muted count beside them (`Ingredientes 4`, `Clássico 11`). No uppercase with letter spacing.
- Grouping is done with hairlines and whitespace. The only cards are Identificar results (tappable, carry a measurement) and the signed-in group in Conta.

## The signature: amber is liquid

The spec calls amber "a cor do líquido nas doses". Every expressive element uses that idea, and one screen gets one of them:

| Screen | Signature |
| --- | --- |
| Identificar | Each result card fills with `amberWash` up to its coverage percent, with an amber meniscus line at the edge. The percent is set large (`measure`) with a small `%`, so the list scans by number. |
| Receita | A glass stacks the `ml` doses bottom-up in pour order, amber layers fading by step. The legend swatches match the layers. Non-liquid doses get a hollow swatch. Drinks with no `ml` dose get no glass. |

Buscar, Favoritos and Conta stay quiet.

## Tokens

| Role | Where |
| --- | --- |
| Color | `src/theme/colors.ts`, the only hex. `amberWash` is amber at 12% alpha, not a second palette. |
| Type | `src/theme/typography.ts`. Fraunces only for drink names and screen titles; Outfit elsewhere. `measure` (Outfit 600, 22) is only for the coverage percent. Counts and doses use tabular figures. |
| Space, radii, 44pt floor, web column | `src/theme/layout.ts` |

Dark only. There is no light palette in this version.

## Rules for the next screen

- Accent (`accent`) only on the primary action, the active tab, and the favorite control. The back control is `text`.
- Amber on doses, selected chips, the per-group selected count, coverage, the glass, and every `Sem álcool` label (spec 4.8).
- The recipe favorite lives in the top bar, opposite Voltar: an accent outline pill (`Favoritar`) that fills when active (`Favorito`). No sticky footer on the recipe; the recipe is for reading.
- Steps are hanging numerals in `textMuted` with hairlines between them. No circles, no rail.
- Buttons: `primary` for the one action a screen exists for, `secondary` for empty-state actions, `quiet` for the lesser alternative (`Criar conta`, `Sair`). Never two full-width pills stacked.
- Empty states: the spec sentence first, then one line saying how the list gets filled, then one secondary action that goes somewhere useful. A failed search points to Identificar.
- Form rules are visible before the error (`Ao menos 6 caracteres` under Senha). Errors render inline with an icon, never as `Alert.alert`.
- Press feedback comes from `src/ui/pressable-scale.tsx`. Haptics from `src/ui/haptics.ts`: selection on chip toggles, a light impact on favorite. None on plain navigation.
