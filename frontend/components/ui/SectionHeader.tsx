import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  detail?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  detail,
}: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  eyebrow: {
    color: mobileTheme.colors.gold,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 17,
    fontWeight: "700",
  },
  detail: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
