import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Não encontrada", headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Essa tela não existe.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Voltar para Buscar</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
    gap: 16,
  },
  title: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: typography.screenTitle.fontSize,
    lineHeight: typography.screenTitle.lineHeight,
    color: colors.text,
    textAlign: "center",
  },
  link: {
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.accent,
  },
});
