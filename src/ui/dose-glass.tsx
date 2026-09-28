import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { DrinkIngredientDetail } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

export type DoseLayer = {
  id: string;
  ml: number;
  opacity: number;
};

export function doseLayers(ingredients: readonly DrinkIngredientDetail[]): DoseLayer[] {
  const liquid = ingredients
    .filter((item) => item.unit === "ml")
    .map((item) => ({ id: item.id, ml: Number(item.amount.replace(",", ".")) }))
    .filter((item) => Number.isFinite(item.ml) && item.ml > 0);
  return liquid.map((item, index) => ({
    ...item,
    opacity: Math.max(0.3, 1 - index * 0.24),
  }));
}

const GLASS_HEIGHT = 156;

export function DoseGlass({ layers }: { layers: readonly DoseLayer[] }) {
  const reduced = useReducedMotion();
  const pour = useSharedValue(reduced ? 1 : 0);
  const total = layers.reduce((sum, layer) => sum + layer.ml, 0);

  useEffect(() => {
    pour.value = reduced
      ? 1
      : withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [pour, reduced]);

  const liquidStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: pour.value }],
  }));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Copo com ${total} ml de líquido`}
    >
      <View style={styles.glass}>
        <Animated.View style={[styles.liquid, liquidStyle]}>
          {[...layers].reverse().map((layer) => (
            <View
              key={layer.id}
              style={[styles.layer, { flex: layer.ml, opacity: layer.opacity }]}
            />
          ))}
        </Animated.View>
      </View>
      <Text style={styles.total}>{total} ml</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
  },
  glass: {
    width: 72,
    height: GLASS_HEIGHT,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.textMuted,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 3,
  },
  liquid: {
    height: "82%",
    gap: 2,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
    transformOrigin: "bottom",
  },
  layer: {
    backgroundColor: colors.amber,
  },
  total: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
    includeFontPadding: false,
  },
});
