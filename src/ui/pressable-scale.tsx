import { forwardRef } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors } from "@/src/theme/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const spring = { damping: 20, stiffness: 300 } as const;

type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
};

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  {
    disabled,
    style,
    rippleColor = colors.textMuted,
    onPressIn,
    onPressOut,
    ...props
  },
  ref,
) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.05,
  }));
  const usePlatformPress = Platform.OS === "android" || reduced === true;

  if (usePlatformPress) {
    return (
      <Pressable
        ref={ref}
        {...props}
        disabled={disabled}
        accessibilityRole={props.accessibilityRole ?? "button"}
        android_ripple={
          Platform.OS === "android" && !disabled
            ? { color: rippleColor, foreground: true }
            : undefined
        }
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed: isPressed }) => [
          style,
          reduced && isPressed && !disabled ? { opacity: 0.72 } : null,
        ]}
      />
    );
  }

  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole ?? "button"}
      onPressIn={(event) => {
        pressed.value = withSpring(1, spring);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, spring);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
});
