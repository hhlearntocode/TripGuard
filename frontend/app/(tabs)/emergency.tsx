import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EMERGENCY_SCRIPTS } from "@/constants/emergency";
import ScreenSurface from "@/components/ui/ScreenSurface";
import AppDashboardMenu from "@/components/ui/AppDashboardMenu";
import SectionHeader from "@/components/ui/SectionHeader";
import { mobileTheme } from "@/theme/mobileTheme";

export default function EmergencyScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Cannot call", `Call ${number} manually.`)
    );
  };

  return (
    <ScreenSurface
      title="Emergency Response"
      subtitle="Designed for moments when the user is stressed and time is already being lost."
      leftNode={<AppDashboardMenu />}
      scrollable={false}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Offline-first fallback</Text>
          <Text style={styles.heroTitle}>Open the exact scenario. Follow the steps. Call from inside the same screen.</Text>
          <Text style={styles.heroBody}>
            This surface avoids discovery noise. It exists to reduce hesitation under pressure.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Critical scenarios"
            title="Choose the situation, not the feature."
            detail="Each panel stays collapsed until needed, keeping the screen stable in a crisis."
          />

          <View style={styles.list}>
            {Object.entries(EMERGENCY_SCRIPTS).map(([key, script]) => {
              const isOpen = expanded === key;
              const icon =
                key === "police_stop" ? "shield-outline" :
                key === "visa_overstay" ? "hourglass-outline" :
                key === "drone_confiscated" ? "airplane-outline" :
                "medkit-outline";

              return (
                <View key={key} style={[styles.card, { borderColor: script.color + "30" }]}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => setExpanded(isOpen ? null : key)}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: script.color + "18" }]}>
                      <Ionicons name={icon as any} size={20} color={script.color} />
                    </View>
                    <Text style={styles.cardTitle}>{script.title}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#8E7F6E"
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.cardBody}>
                      {script.steps.map((step, i) => (
                        <View key={i} style={styles.stepRow}>
                          <View style={[styles.stepNum, { backgroundColor: script.color }]}>
                            <Text style={styles.stepNumText}>{i + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}

                      <View style={styles.hotlines}>
                        <Text style={styles.hotlinesTitle}>Direct call lines</Text>
                        {Object.entries(script.hotlines).map(([label, number]) => (
                          <TouchableOpacity
                            key={label}
                            style={styles.hotlineRow}
                            onPress={() => call(number)}
                          >
                            <Text style={styles.hotlineLabel}>{label}</Text>
                            <View style={styles.callBtn}>
                              <Ionicons name="call" size={14} color="#fff" />
                              <Text style={styles.callBtnText}>{number}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                TripGuard provides general legal information. If detention, confiscation, or medical risk is escalating, contact your embassy immediately.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    borderRadius: 26,
    padding: 20,
    gap: 8,
  },
  heroEyebrow: {
    color: "#E7C79B",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  heroTitle: {
    color: mobileTheme.colors.textOnDark,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
  },
  heroBody: {
    color: "rgba(248, 244, 236, 0.76)",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    padding: 18,
    gap: 12,
    marginBottom: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
  },
  cardBody: {
    padding: 16,
    paddingTop: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: mobileTheme.colors.textSecondary,
    lineHeight: 20,
    fontFamily: mobileTheme.fonts.body,
  },
  hotlines: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  hotlinesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTheme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: mobileTheme.fonts.body,
  },
  hotlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  hotlineLabel: {
    fontSize: 14,
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    flex: 1,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  callBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: mobileTheme.fonts.body,
  },
  disclaimer: {
    backgroundColor: mobileTheme.colors.goldSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 13,
    color: mobileTheme.colors.gold,
    lineHeight: 20,
    fontFamily: mobileTheme.fonts.body,
  },
});
