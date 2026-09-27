import { useSyncExternalStore } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ingredientCategoryLabel, ingredientCategoryOrder } from "@/src/data/labels";
import {
  getSelectedIngredientIds,
  subscribeSelection,
  toggleIngredient,
} from "@/src/data/selection";
import { identifyDrinks, listIngredients } from "@/src/db/queries";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { DrinkCard } from "@/src/ui/drink-card";
import { Screen } from "@/src/ui/screen";

export default function IdentificarScreen() {
  const selected = useSyncExternalStore(
    subscribeSelection,
    getSelectedIngredientIds,
    getSelectedIngredientIds,
  );
  const ingredients = listIngredients();
  const hits = selected.length === 0 ? [] : identifyDrinks(selected);
  const groups = ingredientCategoryOrder
    .map((category) => ({
      category,
      label: ingredientCategoryLabel(category),
      items: ingredients
        .filter((item) => item.category === category)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Screen title="Identificar">
      <View accessibilityRole="text" style={styles.notice}>
        <Text style={styles.noticeText}>Identificar pela câmera chega no 2º bimestre</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map((group) => (
          <View key={group.category} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.chips}>
              {group.items.map((item) => {
                const active = selected.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleIngredient(item.id)}
                    style={[styles.chip, active && styles.chipSelected]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelSelected]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        {selected.length === 0 ? (
          <Text style={styles.empty}>Selecione ao menos um ingrediente</Text>
        ) : null}
        {selected.length > 0 && hits.length === 0 ? (
          <Text style={styles.empty}>Nenhum drink usa esses ingredientes</Text>
        ) : null}
        {hits.map((hit) => (
          <DrinkCard key={hit.id} drink={hit} hit={hit} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: layout.radiusCard,
    padding: layout.screenPadding,
  },
  noticeText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: layout.cardGap,
    paddingBottom: 24,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: layout.radiusPill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  chipLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
  },
  chipLabelSelected: {
    color: colors.background,
  },
  empty: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 12,
  },
});
