import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import { StyleSheet, Text, type ColorValue } from "react-native";

import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

type TabIconName = {
  ios: "magnifyingglass" | "eye" | "heart" | "person";
  android: "search" | "visibility" | "favorite" | "person";
};

function TabIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.android }}
      tintColor={color}
      size={24}
    />
  );
}

function TabLabel({ color, children }: { color: ColorValue; children: string }) {
  return (
    <Text maxFontSizeMultiplier={1.4} style={[styles.label, { color }]}>
      {children}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.background,
        tabBarInactiveBackgroundColor: colors.background,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: "magnifyingglass", android: "search" }} />
          ),
          tabBarLabel: ({ color }) => <TabLabel color={color}>Buscar</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="identificar"
        options={{
          title: "Identificar",
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: "eye", android: "visibility" }} />
          ),
          tabBarLabel: ({ color }) => <TabLabel color={color}>Identificar</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: "heart", android: "favorite" }} />
          ),
          tabBarLabel: ({ color }) => <TabLabel color={color}>Favoritos</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name={{ ios: "person", android: "person" }} />
          ),
          tabBarLabel: ({ color }) => <TabLabel color={color}>Conta</TabLabel>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    includeFontPadding: false,
  },
});
