import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface StatusSummaryBlockProps {
  title: "Allowed" | "Restricted" | "High Risk";
  body: string;
  detail: string;
  tone: "safe" | "warning" | "danger";
}

const TONE_CONFIG = {
  safe: {
    color: mobileTheme.colors.success,
    bg: mobileTheme.colors.successSoft,
    icon: "checkmark-circle-outline",
  },
  warning: {
    color: mobileTheme.colors.warning,
    bg: mobileTheme.colors.warningSoft,
    icon: "alert-circle-outline",
  },
  danger: {
    color: mobileTheme.colors.danger,
    bg: mobileTheme.colors.dangerSoft,
    icon: "warning-outline",
  },
} as const;

export default function StatusSummaryBlock({
  title,
  body,
  detail,
  tone,
}: StatusSummaryBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TONE_CONFIG[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Expand ${title} status guidance`}
      onPress={() => setExpanded((current) => !current)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: config.bg },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: "#FFFFFFD9" }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: config.color }]}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={config.color}
        />
      </View>
      {expanded && <Text style={styles.detail}>{detail}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#D9C6B2",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.95,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  detail: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
