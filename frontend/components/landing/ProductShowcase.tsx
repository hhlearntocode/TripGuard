import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { landingTheme } from "@/components/landing/theme";

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)" } as any)
  : null;

const FEATURES = [
  {
    icon: "chatbubble-ellipses-outline",
    title: "Concise legal answers",
    body:
      "Ask a direct travel question and get a clear legal posture before you act.",
  },
  {
    icon: "checkmark-done-circle-outline",
    title: "Personalized readiness",
    body:
      "Nationality, IDP status, visa logic, and drone rules turn into a tailored checklist.",
  },
  {
    icon: "flash-outline",
    title: "Emergency guidance",
    body:
      "When the issue is urgent, TripGuard shifts from research to calm step-by-step handling.",
  },
];

export default function ProductShowcase() {
  const { width } = useWindowDimensions();
  const compact = width < 980;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.heading}>
          A product showcase built around moments where legal ambiguity is expensive.
        </Text>
        <Text style={styles.subheading}>
          The experience stays composed because the traveler usually is not.
        </Text>
      </View>

      <View style={[styles.cardGrid, compact && styles.cardGridCompact]}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={[styles.card, webGlass]}>
            <View style={styles.iconWrap}>
              <Ionicons name={feature.icon as any} size={20} color={landingTheme.colors.pearl} />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardBody}>{feature.body}</Text>
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
    gap: 20,
  },
  sectionHeader: {
    gap: 10,
    maxWidth: 720,
  },
  heading: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "600",
  },
  subheading: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 17,
    lineHeight: 28,
  },
  cardGrid: {
    flexDirection: "row",
    gap: 18,
  },
  cardGridCompact: {
    flexDirection: "column",
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: landingTheme.colors.panel,
    padding: 22,
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(215, 182, 137, 0.16)",
  },
  cardTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 18,
    fontWeight: "600",
  },
  cardBody: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
});
