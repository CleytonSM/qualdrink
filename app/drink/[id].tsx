import { SymbolView } from "expo-symbols";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { drinkCategoryLabel } from "@/src/data/labels";
import { getDrink, getViewerUserId, setFavorite } from "@/src/db/queries";
import type { DrinkDetail } from "@/src/db/types";
import { subscribeDataChanged, syncIfSession } from "@/src/sync/sync";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { DoseGlass, doseLayers } from "@/src/ui/dose-glass";
import { EmptyState } from "@/src/ui/empty-state";
import { confirmHaptic } from "@/src/ui/haptics";
import { PressableScale } from "@/src/ui/pressable-scale";

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

function FavoriteButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityLabel={active ? "Desfavoritar" : "Favoritar"}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      rippleColor={active ? colors.text : colors.accent}
      style={[styles.favorite, active && styles.favoriteActive]}
    >
      <SymbolView
        name={
          active
            ? { ios: "heart.fill", android: "favorite", web: "favorite" }
            : { ios: "heart", android: "favorite_border", web: "favorite_border" }
        }
        tintColor={active ? colors.text : colors.accent}
        size={18}
      />
      <Text maxFontSizeMultiplier={1.3} style={styles.favoriteLabel}>
        {active ? "Favorito" : "Favoritar"}
      </Text>
    </PressableScale>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

export default function DrinkScreen() {
  const insets = useSafeAreaInsets();
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
    confirmHaptic();
    setFavorite(drink.id, !drink.isFavorite, getViewerUserId());
    reload();
    void syncIfSession();
  }

  const layers = drink ? doseLayers(drink.ingredients) : [];
  const opacityById = new Map(layers.map((layer) => [layer.id, layer.opacity]));
  const categoryIsAlcoholFree = drink?.category === "sem_alcool";
  const showAlcoholFree = drink ? !drink.alcoholic && !categoryIsAlcoholFree : false;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.frame}>
        <View style={styles.bar}>
          <PressableScale
            accessibilityLabel="Voltar"
            onPress={goBack}
            rippleColor={colors.textMuted}
            style={styles.back}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
              tintColor={colors.text}
              size={22}
            />
            <Text maxFontSizeMultiplier={1.4} style={styles.backLabel}>
              Voltar
            </Text>
          </PressableScale>
          {drink ? <FavoriteButton active={drink.isFavorite} onPress={toggleFavorite} /> : null}
        </View>
        {drink ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          >
            <View style={styles.hero}>
              <Text style={[styles.eyebrow, categoryIsAlcoholFree && styles.amberText]}>
                {drinkCategoryLabel(drink.category)}
                {showAlcoholFree ? <Text style={styles.amberText}> · Sem álcool</Text> : null}
              </Text>
              <Text style={styles.title}>{drink.name}</Text>
              <Text style={styles.description}>{drink.description}</Text>
            </View>

            <View style={styles.section}>
              <SectionHead
                title="Ingredientes"
                meta={String(drink.ingredients.length)}
              />
              <View style={styles.dosage}>
                {layers.length > 0 ? <DoseGlass layers={layers} /> : null}
                <View style={styles.ingredients}>
                  {drink.ingredients.map((item, index) => {
                    const opacity = opacityById.get(item.id);
                    const last = index === drink.ingredients.length - 1;
                    return (
                      <View
                        key={item.id}
                        style={[styles.ingredientRow, last && styles.rowLast]}
                      >
                        {opacity !== undefined ? (
                          <View style={[styles.swatch, { opacity }]} />
                        ) : (
                          <View style={styles.swatchEmpty} />
                        )}
                        <Text style={styles.ingredientName}>{item.name}</Text>
                        <Text style={styles.dose}>
                          {item.amount} {item.unit}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <SectionHead
                title="Preparo"
                meta={drink.steps.length === 1 ? "1 passo" : `${drink.steps.length} passos`}
              />
              <View>
                {drink.steps.map((step, index) => {
                  const last = index === drink.steps.length - 1;
                  return (
                    <View key={`${index}-${step}`} style={[styles.stepRow, last && styles.rowLast]}>
                      <Text style={styles.stepIndex}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            label="Drink não encontrado"
            body="O endereço aponta para uma receita que não está no catálogo."
            icon={{ ios: "magnifyingglass", android: "search" }}
            action={{ label: "Ir para Buscar", onPress: () => router.replace("/") }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: layout.webMaxWidth,
    alignSelf: "center",
  },
  bar: {
    minHeight: layout.minTouch + 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
    paddingRight: layout.screenPadding,
  },
  back: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 12,
    overflow: "hidden",
  },
  backLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  favorite: {
    minHeight: layout.minTouch - 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: layout.radiusPill,
    borderWidth: 1,
    borderColor: colors.accent,
    overflow: "hidden",
  },
  favoriteActive: {
    backgroundColor: colors.accent,
  },
  favoriteLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    gap: 28,
  },
  hero: {
    gap: 8,
    paddingTop: 12,
  },
  eyebrow: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  amberText: {
    color: colors.amber,
  },
  title: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: typography.screenTitle.fontSize,
    lineHeight: typography.screenTitle.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  description: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  sectionMeta: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  dosage: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  ingredients: {
    flex: 1,
  },
  ingredientRow: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
  swatchEmpty: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  ingredientName: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  dose: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stepIndex: {
    width: 22,
    fontFamily: typography.label.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  stepText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
});
