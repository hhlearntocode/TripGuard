import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Status = "legal" | "restricted" | "illegal";

interface Props {
  status: Status;
}

const STATUS_CONFIG = {
  legal:      { icon: "checkmark-circle" as const, label: "Legal",      color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.2)" },
  restricted: { icon: "warning" as const,          label: "Restricted", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.2)" },
  illegal:    { icon: "close-circle" as const,     label: "Illegal",    color: "#EF4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.2)" },
};

export default function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: "600" },
});
