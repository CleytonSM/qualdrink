import { Link } from "expo-router";
import { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { drinkCategoryLabel } from "@/src/data/labels";
import type { IdentifyHit } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { PressableScale } from "@/src/ui/pressable-scale";

export const DrinkCard = memo(function DrinkCard({ hit }: { hit: IdentifyHit }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(reduced ? hit.coveragePercent : 0);

  useEffect(() => {
    fill.value = reduced
      ? hit.coveragePercent
      : withSpring(hit.coveragePercent, { damping: 18, stiffness: 120 });
  }, [fill, hit.coveragePercent, reduced]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%`,
  }));

  const alcoholFree = !hit.alcoholic;
  const categoryIsAlcoholFree = hit.category === "sem_alcool";

  return (
    <Link href={{ pathname: "/drink/[id]", params: { id: hit.id } }} asChild>
      <PressableScale
        style={styles.card}
        rippleColor={colors.textMuted}
        accessibilityLabel={`${hit.name}, ${hit.matched} de ${hit.total} ingredientes, ${hit.coveragePercent}%`}
      >
        <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]}>
          <View style={styles.meniscus} />
        </Animated.View>
        <View style={styles.body}>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={2}>
              {hit.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              <Text style={alcoholFree && categoryIsAlcoholFree ? styles.amber : null}>
                {drinkCategoryLabel(hit.category)}
              </Text>
              {alcoholFree && !categoryIsAlcoholFree ? (
                <Text style={styles.amber}> · Sem álcool</Text>
              ) : null}
              {"  ·  "}
              {hit.matched} de {hit.total} ingredientes
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.percent}>
            {hit.coveragePercent}
            <Text style={styles.percentSign}>%</Text>
          </Text>
        </View>
      </PressableScale>
    </Link>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: layout.radiusCard,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.amberWash,
    alignItems: "flex-end",
  },
  meniscus: {
    width: 2,
    height: "100%",
    backgroundColor: colors.amber,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.cardGap,
    paddingVertical: 14,
    paddingHorizontal: layout.screenPadding,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: typography.drinkName.fontFamily,
    fontSize: typography.drinkName.fontSize,
    lineHeight: typography.drinkName.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  meta: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  amber: {
    fontFamily: typography.label.fontFamily,
    color: colors.amber,
  },
  percent: {
    minWidth: 56,
    textAlign: "right",
    fontFamily: typography.measure.fontFamily,
    fontSize: typography.measure.fontSize,
    lineHeight: typography.measure.lineHeight,
    color: colors.amber,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  percentSign: {
    fontSize: typography.label.fontSize,
  },
});
