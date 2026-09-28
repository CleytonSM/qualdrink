import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";

import { ingredientLine } from "@/src/data/ingredient-line";
import {
  getViewerUserId,
  listIngredientNamesByDrink,
  listVisibleFavorites,
} from "@/src/db/queries";
import type { DrinkListItem } from "@/src/db/types";
import { subscribeDataChanged } from "@/src/sync/sync";
import { DrinkRow } from "@/src/ui/drink-row";
import { EmptyState } from "@/src/ui/empty-state";
import { Screen } from "@/src/ui/screen";

export default function FavoritosScreen() {
  const [favorites, setFavorites] = useState<DrinkListItem[]>(() =>
    listVisibleFavorites(getViewerUserId()),
  );
  const ingredients = listIngredientNamesByDrink();

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
        <EmptyState
          label="Nenhum favorito ainda"
          body="Na receita, toque em Favoritar e ela fica guardada aqui, mesmo sem internet."
          icon={{ ios: "heart", android: "favorite" }}
          action={{ label: "Ir para Buscar", onPress: () => router.navigate("/") }}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={favorites}
          keyExtractor={(drink) => drink.id}
          renderItem={({ item }) => (
            <DrinkRow drink={item} ingredients={ingredientLine(ingredients.get(item.id))} />
          )}
          contentContainerStyle={styles.content}
        />
      )}
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
});
