import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { EMERGENCY_SCRIPTS } from "@/constants/emergency";

const SCENARIO_ICONS: Record<string, string> = {
  police_stop: "car-sport",
  visa_overstay: "document-lock",
  drone_confiscated: "airplane",
  drug_accusation: "medkit",
};

export default function EmergencyScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Cannot call", `Call ${number} manually.`)
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0F1C", "#1A0A0F", "#0D1B2A"]}
        style={StyleSheet.absoluteFill}
      />

      <BlurView intensity={40} tint="dark" style={styles.headerBlur}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.alertIcon}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Emergency Guide</Text>
              <Text style={styles.headerSub}>Works offline — tap for step-by-step help</Text>
            </View>
          </View>
        </View>
      </BlurView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {Object.entries(EMERGENCY_SCRIPTS).map(([key, script]) => {
          const isOpen = expanded === key;
          const iconName = SCENARIO_ICONS[key] || "alert-circle";

          return (
            <View key={key} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded(isOpen ? null : key)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { borderColor: script.color + "40" }]}>
                  <Ionicons name={iconName as any} size={20} color={script.color} />
                </View>
                <Text style={styles.cardTitle}>{script.title}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="rgba(255,255,255,0.3)"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.cardBody}>
                  {script.steps.map((step: string, i: number) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: script.color }]}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  <View style={styles.hotlines}>
                    <View style={styles.hotlinesHeader}>
                      <Ionicons name="call" size={14} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.hotlinesTitle}>Hotlines</Text>
                    </View>
                    {Object.entries(script.hotlines).map(([label, number]) => (
                      <TouchableOpacity
                        key={label}
                        style={styles.hotlineRow}
                        onPress={() => call(number as string)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.hotlineLabel}>{label}</Text>
                        <LinearGradient
                          colors={["#14B8A6", "#0D9488"]}
                          style={styles.callBtn}
                        >
                          <Ionicons name="call" size={12} color="#fff" />
                          <Text style={styles.callBtnText}>{number as string}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color="rgba(245,158,11,0.7)" />
          <Text style={styles.disclaimerText}>
            This is general legal information, not legal advice. In serious situations, contact your embassy immediately.
          </Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0F1C" },
  headerBlur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingTop: Platform.OS === "ios" ? 54 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2, fontWeight: "500" },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#F8FAFC" },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 21 },
  hotlines: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  hotlinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  hotlinesTitle: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  hotlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hotlineLabel: { fontSize: 14, color: "rgba(255,255,255,0.55)" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 5,
  },
  callBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  disclaimer: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.12)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  disclaimerText: { flex: 1, fontSize: 13, color: "rgba(245,158,11,0.7)", lineHeight: 20 },
});
