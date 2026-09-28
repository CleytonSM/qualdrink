import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { PressableScale } from "@/src/ui/pressable-scale";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Não encontrada", headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.frame}>
          <Text style={styles.title}>Essa tela não existe.</Text>
          <Link href="/" asChild>
            <PressableScale style={styles.link} rippleColor={colors.textMuted}>
              <Text maxFontSizeMultiplier={1.4} style={styles.linkText}>
                Voltar para Buscar
              </Text>
            </PressableScale>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: "100%",
    maxWidth: layout.webMaxWidth,
    alignItems: "center",
    gap: layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
  },
  title: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: typography.screenTitle.fontSize,
    lineHeight: typography.screenTitle.lineHeight,
    color: colors.text,
    textAlign: "center",
    includeFontPadding: false,
  },
  link: {
    minHeight: layout.minTouch,
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
    overflow: "hidden",
  },
  linkText: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.accent,
    includeFontPadding: false,
  },
});
