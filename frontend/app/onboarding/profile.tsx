import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Switch, TextInput, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { saveUserProfile } from "@/hooks/useUserProfile";
import { NATIONALITIES, getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";

const DRONE_MODELS = Object.keys(DRONE_WEIGHTS);

export default function ProfileScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [nationality, setNationality] = useState("");
  const [search, setSearch] = useState("");
  const [hasDrone, setHasDrone] = useState(false);
  const [droneModel, setDroneModel] = useState("DJI Mini 4 Pro");

  const filtered = NATIONALITIES.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const idpInfo = nationality ? getIdpStatus(nationality) : null;
  const visaFreeDays = nationality ? getVisaFreeDays(nationality) : 0;

  async function handleFinish() {
    const idp = idpInfo;
    let idpType = "None";
    if (idp) {
      if (idp.convention === "1968 Vienna Convention") idpType = "1968 Vienna Convention";
      else if (idp.convention === "1949 Geneva Convention") idpType = "1949 Geneva";
      else if (idp.convention === "ASEAN driving license") idpType = "ASEAN";
      else if (idp.convention === "Bilateral agreement") idpType = "Bilateral";
    }

    await saveUserProfile({
      nationality,
      idp_type: idpType,
      visa_free_days: visaFreeDays,
      has_drone: hasDrone,
      drone_model: hasDrone ? droneModel : "None",
    });
    router.replace("/(tabs)/chat");
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.logoText}>TripGuard</Text>
        </View>
        <Text style={styles.subtitle}>AI Legal Companion for Vietnam</Text>
        <View style={styles.stepIndicator}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Select your nationality</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
            />
            {filtered.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.option, nationality === n && styles.optionSelected]}
                onPress={() => setNationality(n)}
              >
                <Text style={[styles.optionText, nationality === n && styles.optionTextSelected]}>
                  {n}
                </Text>
                {nationality === n && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && idpInfo && (
          <View>
            <Text style={styles.stepTitle}>Your Driving Status</Text>
            <View style={[styles.infoCard, idpInfo.valid ? styles.cardGreen : styles.cardRed]}>
              <Text style={styles.cardEmoji}>{idpInfo.valid ? "✅" : "❌"}</Text>
              <Text style={styles.cardTitle}>{idpInfo.convention}</Text>
              <Text style={styles.cardNote}>{idpInfo.note}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.cardEmoji}>🛂</Text>
              <Text style={styles.cardTitle}>Visa-Free Stay</Text>
              <Text style={styles.cardNote}>
                {visaFreeDays > 0
                  ? `${visaFreeDays} days visa-free for ${nationality} citizens`
                  : `No visa-free entry — e-visa required`}
              </Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Do you have a drone?</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Traveling with a drone</Text>
              <Switch
                value={hasDrone}
                onValueChange={setHasDrone}
                trackColor={{ false: "#E5E7EB", true: "#14B8A6" }}
                thumbColor="#fff"
              />
            </View>
            {hasDrone && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.droneLabel}>Select your drone model:</Text>
                {DRONE_MODELS.map((model) => {
                  const info = DRONE_WEIGHTS[model];
                  return (
                    <TouchableOpacity
                      key={model}
                      style={[styles.option, droneModel === model && styles.optionSelected]}
                      onPress={() => setDroneModel(model)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, droneModel === model && styles.optionTextSelected]}>
                          {model}
                        </Text>
                        <Text style={styles.droneNote}>{info.note}</Text>
                      </View>
                      {droneModel === model && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            step === 0 && !nationality && styles.nextBtnDisabled,
          ]}
          disabled={step === 0 && !nationality}
          onPress={() => {
            if (step < 2) setStep(step + 1);
            else handleFinish();
          }}
        >
          <Text style={styles.nextBtnText}>
            {step === 2 ? "Start TripGuard" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#14B8A6",
    padding: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  logo: { fontSize: 28 },
  logoText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#CCFBF1", marginBottom: 16 },
  stepIndicator: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: "#fff" },
  body: { flex: 1, padding: 20 },
  stepTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    color: "#1F2937",
  },
  option: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionSelected: { borderColor: "#14B8A6", backgroundColor: "#F0FDFA" },
  optionText: { flex: 1, fontSize: 15, color: "#374151" },
  optionTextSelected: { color: "#0F766E", fontWeight: "600" },
  check: { color: "#14B8A6", fontSize: 16, fontWeight: "700" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cardGreen: { borderColor: "#6EE7B7", backgroundColor: "#F0FDF4" },
  cardRed: { borderColor: "#FCA5A5", backgroundColor: "#FFF5F5" },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  cardNote: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchLabel: { fontSize: 16, color: "#1F2937", fontWeight: "500" },
  droneLabel: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8 },
  droneNote: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  footer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  backBtnText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  nextBtn: {
    flex: 2,
    backgroundColor: "#14B8A6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextBtnDisabled: { backgroundColor: "#9CA3AF" },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
