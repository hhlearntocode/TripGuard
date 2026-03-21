import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { BlurView, BlurTint } from "expo-blur";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurTint;
};

/** Blur on native; translucent fallback on web where blur is limited. */
export default function GlassPanel({
  children,
  style,
  intensity = 55,
  tint = "dark",
}: Props) {
  if (Platform.OS === "web") {
    const bg =
      tint === "light"
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(15, 23, 42, 0.78)";
    return <View style={[{ backgroundColor: bg }, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
}
