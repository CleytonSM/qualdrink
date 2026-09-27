import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getViewerUserId, listVisibleFavorites } from "@/src/db/queries";
import type { DrinkListItem } from "@/src/db/types";
import { subscribeDataChanged } from "@/src/sync/sync";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { DrinkCard } from "@/src/ui/drink-card";
import { Screen } from "@/src/ui/screen";

export default function FavoritosScreen() {
  const [favorites, setFavorites] = useState<DrinkListItem[]>(() =>
    listVisibleFavorites(getViewerUserId()),
  );

  const reload = useCallback(() => {
    setFavorites(listVisibleFavorites(getViewerUserId()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => subscribeDataChanged(reload), [reload]);

  return (
    <Screen title="Favoritos">
      {favorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Nenhum favorito ainda</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {favorites.map((drink) => (
            <DrinkCard key={drink.id} drink={drink} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: layout.cardGap,
    paddingBottom: 24,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
    textAlign: "center",
  },
});
