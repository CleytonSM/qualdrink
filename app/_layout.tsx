import {
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import "react-native-reanimated";

import { ensureDatabase } from "@/src/db/client";
import { syncIfSession } from "@/src/sync/sync";
import { colors } from "@/src/theme/colors";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_600SemiBold,
  });
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    ensureDatabase()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setDbError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [loaded, ready]);

  useEffect(() => {
    if (!loaded || !ready) {
      return;
    }
    void syncIfSession();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncIfSession();
      }
    });
    return () => subscription.remove();
  }, [loaded, ready]);

  if (dbError) {
    throw dbError;
  }

  if (!loaded || !ready) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="drink/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
