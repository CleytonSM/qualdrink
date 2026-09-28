import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { PressableScale } from "@/src/ui/pressable-scale";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  size?: "regular" | "compact";
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "regular",
  icon,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const primary = variant === "primary";

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      rippleColor={primary ? colors.text : colors.textMuted}
      style={[
        styles.base,
        size === "compact" && styles.compact,
        styles[variant],
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <Text maxFontSizeMultiplier={1.4} style={styles.label}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch,
    borderRadius: layout.radiusPill,
    paddingVertical: 12,
    paddingHorizontal: layout.screenPadding,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  compact: {
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  quiet: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
});
