import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

interface StatusPillProps {
  state: LegalityUiState;
}

const CONFIG: Record<
  LegalityUiState,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  uncertain: {
    label: "Uncertain",
    icon: "help-circle-outline",
    bg: mobileTheme.colors.surfaceMuted,
    color: mobileTheme.colors.textSecondary,
  },
  checking: {
    label: "Checking",
    icon: "sync-outline",
    bg: mobileTheme.colors.primarySoft,
    color: mobileTheme.colors.primary,
  },
  safe: {
    label: "Verified Safe",
    icon: "shield-checkmark-outline",
    bg: mobileTheme.colors.successSoft,
    color: mobileTheme.colors.success,
  },
  warning: {
    label: "Warning",
    icon: "alert-circle-outline",
    bg: mobileTheme.colors.warningSoft,
    color: mobileTheme.colors.warning,
  },
  restricted: {
    label: "Restricted",
    icon: "close-circle-outline",
    bg: mobileTheme.colors.dangerSoft,
    color: mobileTheme.colors.danger,
  },
};

export default function StatusPill({ state }: StatusPillProps) {
  const config = CONFIG[state];

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={15} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
