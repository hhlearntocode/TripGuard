import React from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { landingTheme } from "@/components/landing/theme";

const VALUES = [
  {
    label: "Sophistication",
    body: "A measured interface that respects the seriousness of legal decisions.",
  },
  {
    label: "Discretion",
    body: "Calm guidance without theatrical alerts, jargon, or panic-driven design.",
  },
  {
    label: "Trust",
    body: "Answers framed around the repo’s source-grounded legal posture, not confident guesswork.",
  },
  {
    label: "Readiness",
    body: "A companion that spans onboarding, checklists, chat, and emergency handling.",
  },
];

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)" } as any)
  : null;

export default function BrandValues() {
  const { width } = useWindowDimensions();
  const compact = width < 1024;

  return (
    <View style={styles.section}>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>Brand values</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          Sophistication here means restraint, not decoration.
        </Text>
        <Text style={styles.body}>
          Every section points back to the same premise: travel feels better when the legal surface is clear, current, and elegantly presented.
        </Text>
      </View>

      <View style={[styles.valueGrid, compact && styles.valueGridCompact]}>
        {VALUES.map((value) => (
          <View key={value.label} style={[styles.valueCard, webGlass]}>
            <Text style={styles.valueLabel}>{value.label}</Text>
            <Text style={styles.valueBody}>{value.body}</Text>
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
  textCol: {
    gap: 10,
    maxWidth: 720,
  },
  eyebrow: {
    color: landingTheme.colors.tealMuted,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "600",
  },
  body: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 16,
    lineHeight: 28,
  },
  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  valueGridCompact: {
    flexDirection: "column",
  },
  valueCard: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 22,
    gap: 10,
  },
  valueLabel: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 18,
    fontWeight: "600",
  },
  valueBody: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
});
