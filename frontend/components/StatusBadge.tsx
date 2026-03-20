import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Status = "legal" | "restricted" | "illegal";

interface Props {
  status: Status;
}

const STATUS_CONFIG = {
  legal:      { emoji: "✅", label: "Legal",      color: "#D1FAE5", textColor: "#065F46" },
  restricted: { emoji: "⚠️", label: "Restricted", color: "#FEF3C7", textColor: "#92400E" },
  illegal:    { emoji: "❌", label: "Illegal",    color: "#FEE2E2", textColor: "#991B1B" },
};

export default function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.label, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start",
  },
  emoji: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600" },
});
