import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";

type TextFieldProps = Omit<TextInputProps, "placeholderTextColor">;

export function TextField({ style, ...props }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      keyboardAppearance="dark"
      autoCorrect={false}
      style={[styles.field, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: layout.radiusField,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
});
