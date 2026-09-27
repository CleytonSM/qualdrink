import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { drinkCategoryLabel } from "@/src/data/labels";
import type { DrinkListItem, IdentifyHit } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";

type DrinkCardProps = {
  drink: DrinkListItem;
  hit?: IdentifyHit;
};

export function DrinkCard({ drink, hit }: DrinkCardProps) {
  return (
    <Link href={{ pathname: "/drink/[id]", params: { id: drink.id } }} asChild>
      <Pressable style={styles.card} accessibilityRole="button">
        <Text style={styles.name}>{drink.name}</Text>
        <Text style={styles.category}>{drinkCategoryLabel(drink.category)}</Text>
        {drink.alcoholic ? null : <Text style={styles.alcoholFree}>Sem álcool</Text>}
        {hit ? (
          <View style={styles.coverageRow}>
            <Text style={styles.coverage}>
              {hit.matched} de {hit.total} ingredientes
            </Text>
            <Text style={styles.percent}>{hit.coveragePercent}%</Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: layout.radiusCard,
    padding: layout.screenPadding,
    gap: 4,
  },
  name: {
    fontFamily: typography.drinkName.fontFamily,
    fontSize: typography.drinkName.fontSize,
    lineHeight: typography.drinkName.lineHeight,
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
  coverageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: layout.cardGap,
    marginTop: 4,
  },
  coverage: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    flexShrink: 1,
  },
  percent: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.amber,
  },
});
