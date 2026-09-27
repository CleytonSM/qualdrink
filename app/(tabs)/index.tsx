import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { searchDrinks } from "@/src/db/queries";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { DrinkCard } from "@/src/ui/drink-card";
import { Screen } from "@/src/ui/screen";
import { TextField } from "@/src/ui/text-field";

export default function BuscarScreen() {
  const [term, setTerm] = useState("");
  const drinks = searchDrinks(term);

  return (
    <Screen title="Buscar">
      <TextField
        value={term}
        onChangeText={setTerm}
        placeholder="Nome do drink"
        accessibilityLabel="Nome do drink"
        autoCapitalize="none"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {drinks.length === 0 ? (
          <Text style={styles.empty}>Nenhum drink com esse nome</Text>
        ) : (
          drinks.map((drink) => <DrinkCard key={drink.id} drink={drink} />)
        )}
      </ScrollView>
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
  empty: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
});
