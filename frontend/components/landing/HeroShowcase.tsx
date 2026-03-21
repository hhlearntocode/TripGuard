import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { landingTheme } from "@/components/landing/theme";

interface HeroShowcaseProps {
  onJoinMembership: () => void;
  onStartExploring: () => void;
}

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" } as any)
  : null;

export default function HeroShowcase({
  onJoinMembership,
  onStartExploring,
}: HeroShowcaseProps) {
  const { width } = useWindowDimensions();
  const compact = width < 1080;

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <View style={styles.copyCol}>
        <View style={[styles.badge, webGlass]}>
          <Text style={styles.badgeText}>{landingTheme.copy.eyebrow}</Text>
        </View>

        <Text accessibilityRole="header" style={styles.displayTitle}>
          {landingTheme.copy.heroTitle}
        </Text>

        <Text style={styles.heroBody}>{landingTheme.copy.heroBody}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaValue}>Source-grounded answers</Text>
            <Text style={styles.metaLabel}>Always framed as legal information, not legal advice.</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaBlock}>
            <Text style={styles.metaValue}>Designed for foreign travelers</Text>
            <Text style={styles.metaLabel}>Personalized onboarding, checklist, and emergency guidance.</Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join the private membership waitlist"
            onPress={onJoinMembership}
            style={({ hovered, pressed }) => [
              styles.primaryButton,
              hovered && styles.primaryButtonHovered,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Request private access</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start exploring TripGuard"
            onPress={onStartExploring}
            style={({ hovered, pressed }) => [
              styles.secondaryButton,
              hovered && styles.secondaryButtonHovered,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Start exploring</Text>
          </Pressable>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Text style={styles.trustLabel}>01</Text>
            <Text style={styles.trustText}>Travel legality at the moment a decision matters</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustLabel}>02</Text>
            <Text style={styles.trustText}>Checklist intelligence tuned to nationality and travel gear</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustLabel}>03</Text>
            <Text style={styles.trustText}>Emergency steps kept clear when attention is limited</Text>
          </View>
        </View>
      </View>

      <View style={styles.visualCol}>
        <View style={[styles.visualFrame, webGlass]}>
          <View style={styles.visualHeader}>
            <View>
              <Text style={styles.visualEyebrow}>Product preview</Text>
              <Text style={styles.visualTitle}>A composed legal cockpit for travel</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Early access</Text>
            </View>
          </View>

          <View style={styles.panelStack}>
            <View style={[styles.mockPanel, styles.topPanel]}>
              <View style={styles.mockPanelHeader}>
                <Ionicons name="shield-checkmark-outline" size={18} color={landingTheme.colors.tealMuted} />
                <Text style={styles.mockPanelTitle}>Live legal guidance</Text>
              </View>
              <Text style={styles.mockLead}>
                "Can I ride in Vietnam with a US license?"
              </Text>
              <View style={styles.responseBlock}>
                <Text style={styles.responseStatus}>Restricted</Text>
                <Text style={styles.responseCopy}>
                  TripGuard surfaces the relevant position before the traveler makes the mistake.
                </Text>
              </View>
            </View>

            <View style={[styles.mockPanel, styles.middlePanel]}>
              <View style={styles.mockPanelHeader}>
                <Ionicons name="map-outline" size={18} color={landingTheme.colors.champagne} />
                <Text style={styles.mockPanelTitle}>Travel readiness</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>1968</Text>
                  <Text style={styles.metricLabel}>IDP check</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>Visa</Text>
                  <Text style={styles.metricLabel}>Entry logic</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>Drone</Text>
                  <Text style={styles.metricLabel}>Permit status</Text>
                </View>
              </View>
            </View>

            <View style={[styles.mockPanel, styles.bottomPanel]}>
              <View style={styles.mockPanelHeader}>
                <Ionicons name="radio-outline" size={18} color={landingTheme.colors.pearl} />
                <Text style={styles.mockPanelTitle}>Emergency mode</Text>
              </View>
              <Text style={styles.responseCopy}>
                Step-based guidance and embassy-first escalation when a situation is no longer theoretical.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    flexDirection: "row",
    gap: 28,
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
  },
  sectionCompact: {
    flexDirection: "column",
  },
  copyCol: {
    flex: 1.05,
    gap: 22,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeText: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  displayTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 62,
    lineHeight: 70,
    fontWeight: "600",
    maxWidth: 680,
  },
  heroBody: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 18,
    lineHeight: 30,
    maxWidth: 620,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "stretch",
  },
  metaBlock: {
    maxWidth: 280,
    gap: 6,
  },
  metaValue: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    fontWeight: "600",
  },
  metaLabel: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  metaDivider: {
    width: 1,
    backgroundColor: landingTheme.colors.line,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: landingTheme.colors.champagne,
  },
  primaryButtonHovered: {
    backgroundColor: "#E5C598",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: landingTheme.colors.ink,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(246, 241, 232, 0.05)",
  },
  secondaryButtonHovered: {
    backgroundColor: "rgba(246, 241, 232, 0.1)",
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  secondaryButtonText: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    fontWeight: "600",
  },
  trustRow: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  trustItem: {
    width: 200,
    gap: 8,
  },
  trustLabel: {
    color: landingTheme.colors.tealMuted,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  trustText: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  visualCol: {
    flex: 0.95,
    minWidth: 0,
  },
  visualFrame: {
    borderRadius: 36,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: 24,
    gap: 22,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  visualHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  visualEyebrow: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  visualTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 28,
    fontWeight: "600",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(20, 184, 166, 0.16)",
  },
  statusPillText: {
    color: landingTheme.colors.tealMuted,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
  },
  panelStack: {
    gap: 14,
  },
  mockPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(246, 241, 232, 0.08)",
    backgroundColor: landingTheme.colors.panelStrong,
    padding: 18,
    gap: 12,
  },
  topPanel: {
    transform: [{ rotate: "-2deg" }],
  },
  middlePanel: {
    backgroundColor: "rgba(12, 30, 39, 0.92)",
  },
  bottomPanel: {
    transform: [{ rotate: "2deg" }],
    backgroundColor: "rgba(29, 27, 23, 0.84)",
  },
  mockPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mockPanelTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    fontWeight: "600",
  },
  mockLead: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "600",
  },
  responseBlock: {
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    gap: 8,
  },
  responseStatus: {
    color: landingTheme.colors.champagne,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  responseCopy: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    minWidth: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
  },
  metricValue: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 24,
    fontWeight: "600",
  },
  metricLabel: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
