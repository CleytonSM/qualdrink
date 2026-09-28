import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { Button } from "@/src/ui/button";

type EmptyIcon = {
  ios: "magnifyingglass" | "heart" | "eye";
  android: "search" | "favorite" | "visibility";
};

type EmptyStateProps = {
  label: string;
  body?: string;
  icon?: EmptyIcon;
  action?: {
    label: string;
    onPress: () => void;
  };
};

export function EmptyState({ label, body, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.column}>
        {icon ? (
          <SymbolView
            name={{ ios: icon.ios, android: icon.android, web: icon.android }}
            tintColor={colors.textMuted}
            size={36}
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.label}>{label}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {action ? (
          <View style={styles.action}>
            <Button label={action.label} variant="secondary" onPress={action.onPress} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  column: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 6,
  },
  icon: {
    marginBottom: 10,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
    textAlign: "center",
  },
  action: {
    marginTop: layout.cardGap,
  },
});
