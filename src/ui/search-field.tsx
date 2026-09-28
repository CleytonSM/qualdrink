import { SymbolView } from "expo-symbols";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { PressableScale } from "@/src/ui/pressable-scale";

type SearchFieldProps = Omit<TextInputProps, "value" | "onChangeText" | "placeholderTextColor"> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function SearchField({ value, onChangeText, ...props }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <SymbolView
        name={{ ios: "magnifyingglass", android: "search", web: "search" }}
        tintColor={colors.textMuted}
        size={20}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        keyboardAppearance="dark"
        autoCorrect={false}
        style={styles.input}
        {...props}
      />
      {value.length > 0 ? (
        <PressableScale
          accessibilityLabel="Limpar busca"
          onPress={() => onChangeText("")}
          style={styles.clear}
        >
          <SymbolView
            name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
            tintColor={colors.textMuted}
            size={18}
          />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: layout.minTouch + 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: layout.radiusField,
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    minHeight: layout.minTouch,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    includeFontPadding: false,
    paddingVertical: 10,
  },
  clear: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: layout.radiusPill,
    overflow: "hidden",
  },
});
