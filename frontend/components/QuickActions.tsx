import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

const QUICK_QUESTIONS = [
  "Can I ride a motorbike with my US license?",
  "Can I fly my drone in Hoi An?",
  "What happens if I overstay my visa?",
  "Can I bring vapes into Vietnam?",
  "What are the alcohol limits for driving?",
  "Do I need a permit for a DJI Mini 4 Pro?",
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
        <TouchableOpacity key={q} style={styles.chip} onPress={() => onSelect(q)}>
          <Text style={styles.chipText}>{q}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 56,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#14B8A6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "500",
  },
});
