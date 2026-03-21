import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EMERGENCY_SCRIPTS } from "@/constants/emergency";
import { COLORS } from "@/constants/theme";

const SCENARIO_ICONS: Record<string, string> = {
  police_stop: "🚔",
  visa_overstay: "🛂",
  drone_confiscated: "🚁",
  drug_test_positive: "💊",
};

export default function EmergencyScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Cannot call", `Dial ${number} manually.`)
    );
  };

  return (
    <LinearGradient colors={[COLORS.bg, "#15202F", COLORS.bg2]} style={styles.root}>
      {/* Header */}
      <BlurView intensity={50} tint="dark" style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.alertBadge}>
            <Text style={styles.alertEmoji}>🚨</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Emergency Guide</Text>
            <Text style={styles.headerSub}>Works offline — tap for step-by-step help</Text>
          </View>
        </View>
      </BlurView>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(EMERGENCY_SCRIPTS).map(([key, script]) => {
          const isOpen = expanded === key;
          const accentColor = script.color;

          return (
            <View
              key={key}
              style={[
                styles.card,
                {
                  borderColor: isOpen ? accentColor + "60" : COLORS.glassBorder,
                  backgroundColor: isOpen ? accentColor + "10" : COLORS.glass,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded(isOpen ? null : key)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: accentColor + "20", borderColor: accentColor + "40" }]}>
                  <Text style={styles.cardIcon}>{SCENARIO_ICONS[key]}</Text>
                </View>
                <Text style={styles.cardTitle}>{script.title}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isOpen ? accentColor : COLORS.textMuted}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.cardBody}>
                  <View style={styles.divider} />

                  {script.steps.map((step: string, i: number) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: accentColor }]}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  <View style={[styles.hotlineBox, { borderColor: accentColor + "30", backgroundColor: accentColor + "08" }]}>
                    <Text style={[styles.hotlineTitle, { color: accentColor }]}>📞 Emergency Hotlines</Text>
                    {Object.entries(script.hotlines).map(([label, number]) => (
                      <TouchableOpacity
                        key={label}
                        style={styles.hotlineRow}
                        onPress={() => call(number as string)}
                      >
                        <Text style={styles.hotlineLabel}>{label}</Text>
                        <View style={[styles.callBtn, { backgroundColor: accentColor }]}>
                          <Ionicons name="call" size={13} color="#fff" />
                          <Text style={styles.callBtnText}>{number as string}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { borderColor: COLORS.warnBorder }]}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.warn} style={{ marginTop: 1 }} />
          <Text style={styles.disclaimerText}>
            General legal information only, not legal advice. In serious situations, contact your embassy immediately.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: "rgba(10, 22, 40, 0.6)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  alertBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.errorGlass,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  alertEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  list: { padding: 16, gap: 12 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: COLORS.glassBorder, marginBottom: 14 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 11, gap: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  hotlineBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  hotlineTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  hotlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hotlineLabel: { fontSize: 13, color: COLORS.textSecondary },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  callBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  disclaimer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: COLORS.warnGlass,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  disclaimerText: { flex: 1, fontSize: 13, color: COLORS.warn, lineHeight: 19 },
});
