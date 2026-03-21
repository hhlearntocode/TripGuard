import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const QUICK_QUESTIONS = [
  "What should I know before clearing immigration?",
  "Can I drive here with my home-country license?",
  "What are the local rules for drones or cameras?",
  "What happens if I overstay my visa?",
  "What items are restricted at customs?",
  "How do alcohol or traffic limits compare to home?",
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
        <TouchableOpacity
          key={q}
          activeOpacity={0.85}
          onPress={() => onSelect(q)}
          style={styles.chipOuter}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chip}
          >
            <View style={styles.chipBorder} pointerEvents="none" />
            <Text style={styles.chipText}>{q}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 58,
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  chipOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
  },
  chipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  chipText: {
    color: "rgba(248, 250, 252, 0.92)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
    maxWidth: 260,
  },
});
