import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { drinkCategoryLabel } from "@/src/data/labels";
import { getDrink, getViewerUserId, setFavorite } from "@/src/db/queries";
import type { DrinkDetail } from "@/src/db/types";
import { subscribeDataChanged, syncIfSession } from "@/src/sync/sync";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { Button } from "@/src/ui/button";

function drinkIdFromParam(id: string | string[] | undefined): string | undefined {
  if (Array.isArray(id)) {
    return id[0];
  }
  return id;
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}

export default function DrinkScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = drinkIdFromParam(params.id);
  const [drink, setDrink] = useState<DrinkDetail | null>(() => (id ? getDrink(id) : null));

  const reload = useCallback(() => {
    setDrink(id ? getDrink(id) : null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => subscribeDataChanged(reload), [reload]);

  function toggleFavorite() {
    if (!drink) {
      return;
    }
    setFavorite(drink.id, !drink.isFavorite, getViewerUserId());
    reload();
    void syncIfSession();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
        <Text style={styles.backLabel}>Voltar</Text>
      </Pressable>
      {drink ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{drink.name}</Text>
          <Text style={styles.category}>{drinkCategoryLabel(drink.category)}</Text>
          {drink.alcoholic ? null : <Text style={styles.alcoholFree}>Sem álcool</Text>}
          <Text style={styles.body}>{drink.description}</Text>
          <Text style={styles.section}>Ingredientes</Text>
          {drink.ingredients.map((item) => (
            <View key={item.id} style={styles.ingredientRow}>
              <Text style={styles.body}>{item.name}</Text>
              <Text style={styles.dose}>
                {item.amount} {item.unit}
              </Text>
            </View>
          ))}
          <Text style={styles.section}>Preparo</Text>
          {drink.steps.map((step, index) => (
            <Text key={`${index}-${step}`} style={styles.body}>
              {index + 1}. {step}
            </Text>
          ))}
          <Button
            label={drink.isFavorite ? "Desfavoritar" : "Favoritar"}
            onPress={toggleFavorite}
          />
        </ScrollView>
      ) : (
        <View style={styles.missing}>
          <Text style={styles.title}>Drink não encontrado</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
    gap: layout.cardGap,
  },
  missing: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    justifyContent: "center",
  },
  title: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: typography.screenTitle.fontSize,
    lineHeight: typography.screenTitle.lineHeight,
    color: colors.text,
  },
  category: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
  },
  alcoholFree: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
  },
  section: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    marginTop: 8,
  },
  body: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    flexShrink: 1,
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: layout.cardGap,
  },
  dose: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
  },
});
