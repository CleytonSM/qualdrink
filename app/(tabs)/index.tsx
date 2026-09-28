import { router } from "expo-router";
import { useState } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";

import { ingredientLine } from "@/src/data/ingredient-line";
import { drinkCategoryLabel, drinkCategoryOrder } from "@/src/data/labels";
import type { DrinkCategory } from "@/src/data/seed";
import { listIngredientNamesByDrink, searchDrinks } from "@/src/db/queries";
import type { DrinkListItem } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { DrinkRow } from "@/src/ui/drink-row";
import { EmptyState } from "@/src/ui/empty-state";
import { Screen } from "@/src/ui/screen";
import { SearchField } from "@/src/ui/search-field";

type Section = {
  category: DrinkCategory;
  data: DrinkListItem[];
};

export default function BuscarScreen() {
  const [term, setTerm] = useState("");
  const drinks = searchDrinks(term);
  const ingredients = listIngredientNamesByDrink();
  const sections: Section[] = drinkCategoryOrder
    .map((category) => ({
      category,
      data: drinks.filter((drink) => drink.category === category),
    }))
    .filter((section) => section.data.length > 0);

  return (
    <Screen title="Buscar">
      <SearchField
        value={term}
        onChangeText={setTerm}
        placeholder="Nome do drink"
        accessibilityLabel="Nome do drink"
        autoCapitalize="none"
        autoComplete="off"
        returnKeyType="search"
      />
      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(drink) => drink.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text
              style={[
                styles.sectionLabel,
                section.category === "sem_alcool" && styles.sectionLabelAmber,
              ]}
            >
              {drinkCategoryLabel(section.category)}
            </Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <DrinkRow
            drink={item}
            ingredients={ingredientLine(ingredients.get(item.id))}
            alcoholFreeTag={section.category !== "sem_alcool"}
          />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, sections.length === 0 && styles.emptyContent]}
        ListEmptyComponent={
          <EmptyState
            label="Nenhum drink com esse nome"
            body="Tente só um pedaço do nome, sem acento. Ou parta do que tem na mão."
            icon={{ ios: "magnifyingglass", android: "search" }}
            action={{
              label: "Identificar pelos ingredientes",
              onPress: () => router.navigate("/identificar"),
            }}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  sectionLabelAmber: {
    color: colors.amber,
  },
  sectionCount: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
});
