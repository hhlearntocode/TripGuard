import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface RiskCategoryTileProps {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function RiskCategoryTile({
  title,
  detail,
  icon,
  onPress,
}: RiskCategoryTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title} category`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={mobileTheme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "48%",
    backgroundColor: "#FFF4F7",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F9E2EA",
    shadowColor: "#E3B8C8",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  tilePressed: {
    backgroundColor: "#FFE7F0",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEFF",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  detail: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
