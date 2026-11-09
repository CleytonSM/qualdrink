import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from "react-native-reanimated";

import type { DrinkIngredientDetail } from "@/src/db/types";
import { colors, ingredientColors as ink } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { doseLayers, ingredientAppearance } from "@/src/ui/ingredient-appearance";

// Fixed positions keep the illustration stable across renders and favorite changes.
const sugarGrains = Array.from({ length: 42 }, (_, i) => ({
  left: 10 + ((i * 29) % 107),
  bottom: 9 + ((i * 13) % (i < 28 ? 26 : 107)),
  size: i % 3 === 0 ? 3 : 2,
  rotation: `${(i * 37) % 90}deg`,
}));
const iceCubes = [
  { left: 17, top: 29, rotate: "-16deg" },
  { left: 72, top: 46, rotate: "19deg" },
  { left: 39, top: 89, rotate: "-9deg" },
];
const bubbles = Array.from({ length: 12 }, (_, i) => ({
  left: 12 + ((i * 31) % 111), bottom: 25 + ((i * 23) % 112), size: 3 + (i % 3),
}));
const sparklingIds = new Set(["agua_com_gas", "agua_tonica", "espumante", "cola", "ginger_beer"]);

function CitrusSlice({ color }: { color: string }) {
  return (
    <View style={[styles.citrus, { backgroundColor: color, borderColor: color === ink.lime ? ink.limeRind : ink.orange }]}>
      <View style={styles.citrusPith}>
        {[0, 60, 120].map((angle) => (
          <View key={angle} style={[styles.citrusSegment, { transform: [{ rotate: `${angle}deg` }] }]} />
        ))}
        <View style={styles.citrusCenter} />
      </View>
    </View>
  );
}

export function IngredientMark({ ingredient }: { ingredient: DrinkIngredientDetail }) {
  const { shape, color } = ingredientAppearance(ingredient);
  return (
    <View style={styles.mark} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shape === "sugar" ? (
        <View style={styles.grainMark}>
          {[0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={styles.grainDot} />)}
        </View>
      ) : (
        <View style={[
          styles.markShape, { backgroundColor: color },
          shape === "ice" && styles.iceMark,
          shape === "citrus" && styles.citrusMark,
          shape === "leaf" && styles.leafMark,
          shape === "other" && styles.otherMark,
        ]} />
      )}
    </View>
  );
}

export function DoseGlass({ ingredients }: { ingredients: readonly DrinkIngredientDetail[] }) {
  const reduced = useReducedMotion();
  const pour = useSharedValue(reduced ? 1 : 0);
  const layers = doseLayers(ingredients);
  const total = layers.reduce((sum, layer) => sum + layer.ml, 0);
  const ids = new Set(ingredients.map((item) => item.id));
  const citrus = ingredients.find((item) => ingredientAppearance(item).shape === "citrus");
  const unmeasuredLiquids = ingredients.filter((item) =>
    ingredientAppearance(item).shape === "liquid" && !layers.some((layer) => layer.id === item.id),
  );
  const hasBubbles = ingredients.some((item) => sparklingIds.has(item.id));
  const totalLabel = total.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const recipeKey = ingredients.map((item) => `${item.id}:${item.amount}:${item.unit}`).join("|");

  useEffect(() => {
    pour.value = reduced ? 1 : 0;
    if (!reduced) pour.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [pour, reduced, recipeKey]);

  const liquidStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: pour.value }] }));
  const solidsStyle = useAnimatedStyle(() => ({
    opacity: pour.value,
    transform: [{ translateY: (1 - pour.value) * -12 }],
  }));

  return (
    <View style={styles.wrap}>
      <View
        style={styles.scene}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Ilustração dos ingredientes: ${ingredients.map((item) => item.name).join(", ")}.`}
      >
        <View style={styles.halo} />
        <View style={styles.ground} />
        <View style={styles.glass}>
          <Animated.View style={[styles.liquid, liquidStyle]}>
            {unmeasuredLiquids.map((item) => (
              <View key={item.id} style={[styles.layer, { flex: 1, backgroundColor: ingredientAppearance(item).color }]} />
            ))}
            {[...layers].reverse().map((layer) => (
              <View key={layer.id} style={[styles.layer, { flex: layer.ml / (total || 1), backgroundColor: layer.color }]} />
            ))}
            {layers.length === 0 && unmeasuredLiquids.length === 0 ? <View style={styles.emptyFill} /> : null}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, solidsStyle]}>
            {hasBubbles ? bubbles.map((bubble, i) => (
              <View key={`bubble-${i}`} style={[styles.bubble, { left: bubble.left, bottom: bubble.bottom, width: bubble.size, height: bubble.size }]} />
            )) : null}
            {ids.has("gelo") ? iceCubes.map((cube, i) => (
              <View key={`ice-${i}`} style={[styles.ice, { left: cube.left, top: cube.top, transform: [{ rotate: cube.rotate }] }]}>
                <View style={styles.iceShine} />
              </View>
            )) : null}
            {citrus ? (
              <>
                <View style={styles.fruitLower}><CitrusSlice color={ingredientAppearance(citrus).color} /></View>
                <View style={styles.fruitUpper}><CitrusSlice color={ingredientAppearance(citrus).color} /></View>
              </>
            ) : null}
            {ids.has("hortela") ? [0, 1, 2].map((i) => (
              <View key={`mint-${i}`} style={[styles.leaf, { left: 20 + i * 34, top: 22 + i * 42, transform: [{ rotate: `${-35 + i * 42}deg` }] }]}>
                <View style={styles.leafVein} />
              </View>
            )) : null}
            {ids.has("acucar") ? sugarGrains.map((grain, i) => (
              <View key={`sugar-${i}`} style={[styles.sugar, {
                left: grain.left, bottom: grain.bottom, width: grain.size, height: grain.size,
                opacity: i < 28 ? 0.95 : 0.65, transform: [{ rotate: grain.rotation }],
              }]} />
            )) : null}
          </Animated.View>
          <View style={styles.reflection} />
          <View style={styles.reflectionThin} />
          <View style={styles.base} />
        </View>
        <View style={styles.rim} />
      </View>
      <View style={styles.caption}>
        <Text style={styles.total}>{total > 0 ? `${totalLabel} ml dosados` : "Medidas na receita"}</Text>
        <Text style={styles.hint}>Ilustração dos ingredientes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 4, paddingBottom: 20, gap: 8 },
  scene: { width: 248, height: 224, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 206, height: 206, borderRadius: 103, backgroundColor: colors.surface },
  ground: { position: "absolute", bottom: 7, width: 164, height: 18, borderRadius: 82, backgroundColor: colors.surfaceRaised },
  glass: {
    width: 140, height: 188, borderWidth: 1.5, borderTopWidth: 0,
    borderColor: ink.glassEdge, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: "hidden", justifyContent: "flex-end", padding: 5, backgroundColor: ink.glassShine,
  },
  liquid: { height: "83%", borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", transformOrigin: "bottom" },
  layer: { opacity: 0.62, minHeight: 2 },
  emptyFill: { flex: 1, backgroundColor: ink.clear, opacity: 0.12 },
  rim: { position: "absolute", top: 14, width: 140, height: 10, borderRadius: 70, borderWidth: 1.5, borderColor: ink.glassEdge, backgroundColor: ink.glassShine },
  reflection: { position: "absolute", top: 13, left: 8, width: 6, height: 133, borderRadius: 4, backgroundColor: ink.glassShine },
  reflectionThin: { position: "absolute", top: 18, right: 9, width: 2, height: 126, backgroundColor: ink.glassShine },
  base: { position: "absolute", bottom: 3, left: 24, right: 24, height: 3, borderRadius: 3, backgroundColor: ink.glassEdge },
  ice: { position: "absolute", width: 44, height: 43, borderRadius: 10, borderWidth: 1.5, borderColor: ink.iceEdge, backgroundColor: ink.iceFill },
  iceShine: { position: "absolute", top: 5, left: 5, width: 22, height: 4, borderRadius: 3, backgroundColor: ink.iceEdge },
  bubble: { position: "absolute", borderRadius: 5, borderWidth: 1, borderColor: ink.bubble },
  sugar: { position: "absolute", borderRadius: 0.5, backgroundColor: ink.sugar },
  fruitLower: { position: "absolute", left: 13, bottom: 28, transform: [{ rotate: "-25deg" }] },
  fruitUpper: { position: "absolute", right: 5, top: 26, transform: [{ rotate: "24deg" }, { scale: 0.8 }] },
  citrus: { width: 65, height: 34, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, borderWidth: 3, overflow: "hidden" },
  citrusPith: { flex: 1, borderWidth: 1, borderColor: ink.sugar, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden" },
  citrusSegment: { position: "absolute", top: -28, left: 28, height: 58, width: 1.5, backgroundColor: ink.sugar },
  citrusCenter: { position: "absolute", top: -4, left: 25, width: 9, height: 9, borderRadius: 5, backgroundColor: ink.sugar },
  leaf: { position: "absolute", width: 20, height: 34, borderTopLeftRadius: 20, borderBottomRightRadius: 20, borderTopRightRadius: 3, borderBottomLeftRadius: 3, backgroundColor: ink.mint, alignItems: "center" },
  leafVein: { width: 1, height: 28, marginTop: 3, backgroundColor: ink.mintVein, transform: [{ rotate: "24deg" }] },
  caption: { alignItems: "center", gap: 4 },
  total: { ...typography.label, color: colors.amber, fontVariant: ["tabular-nums"] },
  hint: { ...typography.label, fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.textMuted },
  mark: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  markShape: { width: 12, height: 16, borderRadius: 8, borderTopRightRadius: 2, transform: [{ rotate: "-35deg" }] },
  iceMark: { width: 17, height: 17, borderRadius: 4, borderTopRightRadius: 4, backgroundColor: ink.iceFill, borderWidth: 1, borderColor: ink.iceEdge, transform: [{ rotate: "-12deg" }] },
  citrusMark: { width: 22, height: 12, borderRadius: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: ink.sugar, transform: [{ rotate: "-25deg" }] },
  leafMark: { width: 13, height: 21, borderTopLeftRadius: 14, borderBottomRightRadius: 14, borderTopRightRadius: 2, borderBottomLeftRadius: 2 },
  otherMark: { width: 12, height: 12, borderRadius: 6, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.textMuted },
  grainMark: { width: 18, flexDirection: "row", flexWrap: "wrap", gap: 3, transform: [{ rotate: "-15deg" }] },
  grainDot: { width: 4, height: 4, borderRadius: 1, backgroundColor: ink.sugar },
});
