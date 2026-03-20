import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Linking, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EMERGENCY_SCRIPTS } from "@/constants/emergency";

export default function EmergencyScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Cannot call", `Call ${number} manually.`)
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚨 Emergency Guide</Text>
        <Text style={styles.headerSub}>Works offline — tap for step-by-step help</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {Object.entries(EMERGENCY_SCRIPTS).map(([key, script]) => {
          const isOpen = expanded === key;
          return (
            <View key={key} style={[styles.card, { borderLeftColor: script.color }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded(isOpen ? null : key)}
              >
                <View style={[styles.iconCircle, { backgroundColor: script.color + "20" }]}>
                  <Text style={styles.cardIcon}>
                    {key === "police_stop" ? "🚔" :
                     key === "visa_overstay" ? "🛂" :
                     key === "drone_confiscated" ? "🚁" : "💊"}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{script.title}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#9CA3AF"
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
                    <Text style={styles.hotlinesTitle}>📞 Hotlines</Text>
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
            ⚠️ This is general legal information, not legal advice. In serious situations, contact your embassy immediately.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  cardIcon: { fontSize: 22 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1F2937" },
  cardBody: { padding: 16, paddingTop: 0 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 10 },
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
  stepText: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
  hotlines: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  hotlinesTitle: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  hotlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  hotlineLabel: { fontSize: 14, color: "#374151" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14B8A6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  callBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  disclaimer: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  disclaimerText: { fontSize: 13, color: "#92400E", lineHeight: 20 },
});
