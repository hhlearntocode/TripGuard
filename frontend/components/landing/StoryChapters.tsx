import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { landingTheme } from "@/components/landing/theme";

const CHAPTERS = [
  {
    number: "01",
    title: "Arrival starts with uncertainty.",
    body:
      "Foreign travelers are often forced to make legal decisions through hearsay, forum advice, and partial translations while already in motion.",
  },
  {
    number: "02",
    title: "A mistake is rarely small.",
    body:
      "Licensing, visa limits, drone permissions, and police encounters do not behave like soft UX friction. They can become fines, confiscation, or worse.",
  },
  {
    number: "03",
    title: "TripGuard narrows the decision.",
    body:
      "The product turns legal complexity into a direct reading of the situation: what is allowed, what is restricted, what is required next.",
  },
  {
    number: "04",
    title: "Confidence becomes part of the itinerary.",
    body:
      "Instead of reacting after a problem, the traveler carries legal clarity forward through chat, readiness checks, and emergency guidance.",
  },
];

export default function StoryChapters() {
  const { width } = useWindowDimensions();
  const compact = width < 1100;

  return (
    <View style={styles.section}>
      <View style={styles.copyBlock}>
        <Text style={styles.eyebrow}>Storyline</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          A premium narrative, anchored to a practical problem.
        </Text>
      </View>

      <View style={[styles.chapterGrid, compact && styles.chapterGridCompact]}>
        {CHAPTERS.map((chapter) => (
          <View key={chapter.number} style={styles.chapterCard}>
            <Text style={styles.chapterNumber}>{chapter.number}</Text>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <Text style={styles.chapterBody}>{chapter.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 24,
  },
  copyBlock: {
    gap: 10,
    maxWidth: 700,
  },
  eyebrow: {
    color: landingTheme.colors.tealMuted,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heading: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "600",
  },
  chapterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  chapterGridCompact: {
    flexDirection: "column",
  },
  chapterCard: {
    flexBasis: "48%",
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: "rgba(246, 241, 232, 0.18)",
    paddingTop: 18,
    paddingRight: 18,
    gap: 10,
  },
  chapterNumber: {
    color: landingTheme.colors.champagne,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  chapterTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
  },
  chapterBody: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    lineHeight: 26,
    maxWidth: 520,
  },
});
