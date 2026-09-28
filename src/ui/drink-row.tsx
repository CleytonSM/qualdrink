import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { drinkCategoryLabel } from "@/src/data/labels";
import type { DrinkListItem } from "@/src/db/types";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { PressableScale } from "@/src/ui/pressable-scale";

type DrinkRowProps = {
  drink: DrinkListItem;
  ingredients: string;
  /** Falso quando a seção em volta já diz "Sem álcool". */
  alcoholFreeTag?: boolean;
};

export const DrinkRow = memo(function DrinkRow({
  drink,
  ingredients,
  alcoholFreeTag = true,
}: DrinkRowProps) {
  const tagged = alcoholFreeTag && !drink.alcoholic;
  const line = ingredients || drinkCategoryLabel(drink.category);

  return (
    <Link href={{ pathname: "/drink/[id]", params: { id: drink.id } }} asChild>
      <PressableScale
        style={styles.row}
        rippleColor={colors.textMuted}
        accessibilityLabel={`${drink.name}${tagged ? ", sem álcool" : ""}. ${line}`}
      >
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {drink.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {tagged ? <Text style={styles.alcoholFree}>Sem álcool · </Text> : null}
            {line}
          </Text>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          tintColor={colors.border}
          size={18}
        />
      </PressableScale>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.cardGap,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    overflow: "hidden",
  },
  text: {
    flex: 1,
    gap: 2,
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
    lineHeight: typography.label.lineHeight + 2,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  alcoholFree: {
    fontFamily: typography.label.fontFamily,
    color: colors.amber,
  },
});
