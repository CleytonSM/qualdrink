import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ingredientCategoryLabel, ingredientCategoryOrder } from "@/src/data/labels";
import {
  clearSelection,
  getSelectedIngredientIds,
  subscribeSelection,
  toggleIngredient,
} from "@/src/data/selection";
import { identifyDrinks, listIngredients } from "@/src/db/queries";
import type { IdentifyHit } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { Button } from "@/src/ui/button";
import { DrinkCard } from "@/src/ui/drink-card";
import { selectionHaptic } from "@/src/ui/haptics";
import { PressableScale } from "@/src/ui/pressable-scale";
import { Screen } from "@/src/ui/screen";

const TRAY_HEIGHT = 76;

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

export default function IdentificarScreen() {
  const listRef = useRef<FlatList<IdentifyHit>>(null);
  const reduced = useReducedMotion();
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

  const trayVisible = selected.length > 0;
  const tray = useSharedValue(trayVisible ? 1 : 0);

  useEffect(() => {
    const target = trayVisible ? 1 : 0;
    tray.value = reduced ? target : withSpring(target, { damping: 20, stiffness: 220 });
  }, [reduced, tray, trayVisible]);

  const trayStyle = useAnimatedStyle(() => ({
    opacity: tray.value,
    transform: [{ translateY: (1 - tray.value) * (TRAY_HEIGHT + 16) }],
  }));

  function toggle(id: string) {
    selectionHaptic();
    toggleIngredient(id);
  }

  function showResults() {
    if (hits.length === 0) {
      return;
    }
    listRef.current?.scrollToIndex({ index: 0, animated: !reduced, viewOffset: 8 });
  }

  return (
    <Screen title="Identificar">
      <View style={styles.flex}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={hits}
          keyExtractor={(hit) => hit.id}
          renderItem={({ item }) => <DrinkCard hit={item} />}
          onScrollToIndexFailed={() => listRef.current?.scrollToEnd({ animated: !reduced })}
          contentContainerStyle={[
            styles.content,
            trayVisible && { paddingBottom: TRAY_HEIGHT + 32 },
          ]}
          ListHeaderComponent={
            <View style={styles.header}>
              <View accessibilityRole="text" style={styles.notice}>
                <SymbolView
                  name={{ ios: "camera", android: "photo_camera", web: "photo_camera" }}
                  tintColor={colors.textMuted}
                  size={16}
                />
                <Text style={styles.noticeText}>
                  Identificar pela câmera chega no 2º bimestre
                </Text>
              </View>
              {selected.length === 0 ? (
                <Text style={styles.hint}>Selecione ao menos um ingrediente</Text>
              ) : null}
              {groups.map((group) => {
                const picked = group.items.filter((item) => selected.includes(item.id)).length;
                return (
                  <View key={group.category} style={styles.group}>
                    <View style={styles.groupHead}>
                      <Text style={styles.groupLabel}>{group.label}</Text>
                      {picked > 0 ? (
                        <Text style={styles.groupCount}>
                          {picked} de {group.items.length}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.chips}>
                      {group.items.map((item) => {
                        const active = selected.includes(item.id);
                        return (
                          <PressableScale
                            key={item.id}
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={item.name}
                            onPress={() => toggle(item.id)}
                            rippleColor={active ? colors.background : colors.textMuted}
                            style={[styles.chip, active && styles.chipSelected]}
                          >
                            {active ? (
                              <SymbolView
                                name={{ ios: "checkmark", android: "check", web: "check" }}
                                tintColor={colors.background}
                                size={14}
                              />
                            ) : null}
                            <Text
                              maxFontSizeMultiplier={1.4}
                              style={[styles.chipLabel, active && styles.chipLabelSelected]}
                            >
                              {item.name}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              {selected.length > 0 && hits.length === 0 ? (
                <Text style={styles.hint}>Nenhum drink usa esses ingredientes</Text>
              ) : null}
              {hits.length > 0 ? (
                <Text style={styles.resultsLabel}>
                  {plural(hits.length, "drink", "drinks")} com esses ingredientes
                </Text>
              ) : null}
            </View>
          }
        />
        <Animated.View
          pointerEvents={trayVisible ? "auto" : "none"}
          style={[styles.tray, trayStyle]}
        >
          <View style={styles.trayText}>
            <Text style={styles.trayCount} numberOfLines={1}>
              {plural(selected.length, "ingrediente", "ingredientes")}
            </Text>
            <Text style={styles.trayMeta} numberOfLines={1}>
              {hits.length > 0
                ? `${hits[0]?.name} ${hits[0]?.coveragePercent}%`
                : "Nenhum drink ainda"}
            </Text>
          </View>
          <Button label="Limpar" variant="secondary" size="compact" onPress={clearSelection} />
          <Button
            label={hits.length > 0 ? `Ver ${hits.length}` : "Ver drinks"}
            accessibilityLabel={`Ver ${plural(hits.length, "drink", "drinks")}`}
            size="compact"
            disabled={hits.length === 0}
            onPress={showResults}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: layout.cardGap,
    paddingBottom: 24,
  },
  header: {
    gap: 22,
    marginBottom: 4,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -4,
  },
  noticeText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
  },
  hint: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  group: {
    gap: 10,
  },
  groupHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  groupLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  groupCount: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: layout.radiusPill,
    paddingHorizontal: 14,
    overflow: "hidden",
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
    includeFontPadding: false,
  },
  chipLabelSelected: {
    color: colors.background,
  },
  resultsLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    marginTop: 4,
    includeFontPadding: false,
  },
  tray: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    minHeight: TRAY_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: layout.screenPadding,
    paddingRight: 10,
    paddingVertical: 10,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: layout.radiusCard,
    shadowColor: colors.background,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  trayText: {
    flex: 1,
    gap: 2,
  },
  trayCount: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  trayMeta: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
    includeFontPadding: false,
  },
});
