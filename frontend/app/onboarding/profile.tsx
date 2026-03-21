import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, TextInput, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
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
    router.replace("/home" as Href);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0F1C", "#0D1B2A", "#122333"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <LinearGradient colors={["#14B8A6", "#0D9488"]} style={styles.logoIcon}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
          </LinearGradient>
          <Text style={styles.logoText}>TripGuard</Text>
        </View>
        <Text style={styles.subtitle}>AI Legal Companion for Vietnam</Text>
        <View style={styles.stepIndicator}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                step >= i && styles.dotActive,
                step === i && styles.dotCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Select your nationality</Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="rgba(255,255,255,0.25)"
                selectionColor="#14B8A6"
              />
            </View>
            {filtered.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.option, nationality === n && styles.optionSelected]}
                onPress={() => setNationality(n)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, nationality === n && styles.optionTextSelected]}>
                  {n}
                </Text>
                {nationality === n && (
                  <Ionicons name="checkmark-circle" size={20} color="#14B8A6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && idpInfo && (
          <View>
            <Text style={styles.stepTitle}>Your Driving Status</Text>
            <View style={[styles.infoCard, idpInfo.valid ? styles.cardGreen : styles.cardRed]}>
              <Ionicons
                name={idpInfo.valid ? "checkmark-circle" : "close-circle"}
                size={32}
                color={idpInfo.valid ? "#10B981" : "#EF4444"}
              />
              <Text style={styles.cardTitle}>{idpInfo.convention}</Text>
              <Text style={styles.cardNote}>{idpInfo.note}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="document-text" size={32} color="#14B8A6" />
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
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "#14B8A6" }}
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
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, droneModel === model && styles.optionTextSelected]}>
                          {model}
                        </Text>
                        <Text style={styles.droneNote}>{info.note}</Text>
                      </View>
                      {droneModel === model && (
                        <Ionicons name="checkmark-circle" size={20} color="#14B8A6" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      <BlurView intensity={40} tint="dark" style={styles.footerBlur}>
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, step === 0 && !nationality && styles.nextBtnDisabled]}
            disabled={step === 0 && !nationality}
            onPress={() => {
              if (step < 2) setStep(step + 1);
              else handleFinish();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                step === 0 && !nationality
                  ? ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.03)"]
                  : ["#14B8A6", "#0D9488"]
              }
              style={styles.nextBtnGradient}
            >
              <Text style={[
                styles.nextBtnText,
                step === 0 && !nationality && { color: "rgba(255,255,255,0.2)" },
              ]}>
                {step === 2 ? "Start TripGuard" : "Continue"}
              </Text>
              <Ionicons
                name={step === 2 ? "shield-checkmark" : "arrow-forward"}
                size={18}
                color={step === 0 && !nationality ? "rgba(255,255,255,0.2)" : "#fff"}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0F1C" },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 64 : 50,
    paddingBottom: 24,
    alignItems: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { fontSize: 24, fontWeight: "800", color: "#F8FAFC", letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 20, fontWeight: "500" },
  stepIndicator: { flexDirection: "row", gap: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dotActive: { backgroundColor: "rgba(20,184,166,0.4)" },
  dotCurrent: { backgroundColor: "#14B8A6", width: 24 },
  body: { flex: 1, paddingHorizontal: 20 },
  stepTitle: { fontSize: 20, fontWeight: "700", color: "#F8FAFC", marginBottom: 16, letterSpacing: 0.3 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#F8FAFC",
  },
  option: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 15,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  optionSelected: {
    borderColor: "rgba(20,184,166,0.4)",
    backgroundColor: "rgba(20,184,166,0.08)",
  },
  optionText: { flex: 1, fontSize: 15, color: "rgba(255,255,255,0.6)" },
  optionTextSelected: { color: "#14B8A6", fontWeight: "600" },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 8,
  },
  cardGreen: { borderColor: "rgba(16,185,129,0.3)", backgroundColor: "rgba(16,185,129,0.08)" },
  cardRed: { borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC" },
  cardNote: { fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 20 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  switchLabel: { fontSize: 16, color: "#F8FAFC", fontWeight: "500" },
  droneLabel: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginBottom: 10 },
  droneNote: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 },
  footerBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  backBtnText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  nextBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  nextBtnDisabled: {},
  nextBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
