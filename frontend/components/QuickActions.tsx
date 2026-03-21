import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { COLORS } from "@/constants/theme";

const QUICK_QUESTIONS = [
  { icon: "🏍️", text: "Can I ride a motorbike with my US license?" },
  { icon: "🚁", text: "Can I fly my drone in Hoi An?" },
  { icon: "🛂", text: "What happens if I overstay my visa?" },
  { icon: "🚬", text: "Can I bring vapes into Vietnam?" },
  { icon: "🍺", text: "What are the alcohol limits for driving?" },
  { icon: "📸", text: "Do I need a permit for a DJI Mini 4 Pro?" },
];

interface Props {
  onSelect: (question: string) => void;
  visible: boolean;
}

export default function QuickActions({ onSelect, visible }: Props) {
  if (!visible) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {QUICK_QUESTIONS.map((q) => (
        <TouchableOpacity key={q.text} style={styles.chip} onPress={() => onSelect(q.text)}>
          <Text style={styles.chipIcon}>{q.icon}</Text>
          <Text style={styles.chipText}>{q.text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipIcon: { fontSize: 14 },
  chipText: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 200,
  },
});
