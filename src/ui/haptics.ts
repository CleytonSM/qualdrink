import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function selectionHaptic(): void {
  if (Platform.OS === "web") {
    return;
  }
  void Haptics.selectionAsync();
}

export function confirmHaptic(): void {
  if (Platform.OS === "web") {
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
