import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/theme";

type Status = "legal" | "restricted" | "illegal";

interface Props {
  status: Status;
}

const STATUS_CONFIG = {
  legal:      { emoji: "✅", label: "Legal",      bg: COLORS.okGlass,    border: COLORS.okBorder,    text: COLORS.ok },
  restricted: { emoji: "⚠️", label: "Restricted", bg: COLORS.warnGlass,  border: COLORS.warnBorder,  text: COLORS.warn },
  illegal:    { emoji: "❌", label: "Illegal",    bg: COLORS.errorGlass, border: COLORS.errorBorder, text: COLORS.error },
};

export default function StatusBadge({ status }: Props) {
  const c = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={styles.emoji}>{c.emoji}</Text>
      <Text style={[styles.label, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  emoji: { fontSize: 13 },
  label: { fontSize: 12, fontWeight: "700" },
});
