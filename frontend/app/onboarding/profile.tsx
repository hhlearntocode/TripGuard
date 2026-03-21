import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, TextInput, Platform, SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveUserProfile } from "@/hooks/useUserProfile";
import { NATIONALITIES, getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";
import { COLORS, GLASS_CARD } from "@/constants/theme";

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
    <LinearGradient colors={[COLORS.bg, "#112240", COLORS.bg2]} style={styles.root}>
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
              <View
                key={i}
                style={[
                  styles.dot,
                  step > i && styles.dotDone,
                  step === i && styles.dotActive,
                ]}
              >
                {step > i && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
            ))}
          </View>
          <Text style={styles.stepLabel}>
            {step === 0 ? "Nationality" : step === 1 ? "Travel Status" : "Drone"}
          </Text>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>Select your nationality</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search country..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              {filtered.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.option, nationality === n && styles.optionSelected]}
                  onPress={() => setNationality(n)}
                >
                  <Text style={[styles.optionText, nationality === n && styles.optionTextSelected]}>
                    {n}
                  </Text>
                  {nationality === n && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.teal} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 1 && idpInfo && (
            <View>
              <Text style={styles.stepTitle}>Your Travel Status</Text>

              <View style={[styles.infoCard, idpInfo.valid ? styles.cardOk : styles.cardErr]}>
                <Text style={styles.cardEmoji}>{idpInfo.valid ? "✅" : "❌"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {idpInfo.valid ? "IDP Valid in Vietnam" : "IDP Not Recognised"}
                  </Text>
                  <Text style={styles.cardNote}>{idpInfo.convention}</Text>
                  <Text style={[styles.cardNote, { marginTop: 4, opacity: 0.8 }]}>{idpInfo.note}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardEmoji}>🛂</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Visa-Free Stay</Text>
                  <Text style={styles.cardNote}>
                    {visaFreeDays > 0
                      ? `${visaFreeDays} days visa-free for ${nationality} citizens`
                      : `No visa-free entry — e-visa required`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Do you have a drone?</Text>

              <View style={styles.switchCard}>
                <View style={styles.switchLeft}>
                  <Text style={styles.switchIcon}>🚁</Text>
                  <Text style={styles.switchLabel}>Traveling with a drone</Text>
                </View>
                <Switch
                  value={hasDrone}
                  onValueChange={setHasDrone}
                  trackColor={{ false: COLORS.glass, true: COLORS.teal }}
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
                        {droneModel === model && (
                          <Ionicons name="checkmark-circle" size={18} color={COLORS.teal} />
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

        {/* Footer */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
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
            <LinearGradient
              colors={
                step === 0 && !nationality
                  ? [COLORS.glass, COLORS.glass]
                  : [COLORS.teal, "#0EA5E9"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>
                {step === 2 ? "Start TripGuard" : "Continue"}
              </Text>
              <Ionicons
                name={step === 2 ? "shield-checkmark" : "arrow-forward"}
                size={18}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 20 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logo: { fontSize: 32 },
  logoText: { fontSize: 28, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  stepIndicator: { flexDirection: "row", gap: 12, marginBottom: 8 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  dotActive: {
    backgroundColor: COLORS.tealGlass,
    borderColor: COLORS.teal,
    width: 36,
  },
  dotDone: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.tealLight,
  },
  stepLabel: { fontSize: 12, color: COLORS.teal, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },

  body: { flex: 1, paddingHorizontal: 20 },

  stepTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 16 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  option: {
    backgroundColor: COLORS.glass,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  optionSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealGlass,
  },
  optionText: { flex: 1, fontSize: 15, color: COLORS.textSecondary },
  optionTextSelected: { color: COLORS.teal, fontWeight: "600" },

  infoCard: {
    ...GLASS_CARD,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardOk: { borderColor: COLORS.okBorder, backgroundColor: COLORS.okGlass },
  cardErr: { borderColor: COLORS.errorBorder, backgroundColor: COLORS.errorGlass },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  cardNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  switchCard: {
    ...GLASS_CARD,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchIcon: { fontSize: 22 },
  switchLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "500" },

  droneLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 10 },
  droneNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  footer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  backBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.textSecondary },
  nextBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
