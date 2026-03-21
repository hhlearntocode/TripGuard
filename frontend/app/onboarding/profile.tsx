import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { saveUserProfile } from "@/hooks/useUserProfile";
import { NATIONALITIES, getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";
import ScreenSurface from "@/components/ui/ScreenSurface";
import SectionHeader from "@/components/ui/SectionHeader";
import { mobileTheme } from "@/theme/mobileTheme";

const DRONE_MODELS = Object.keys(DRONE_WEIGHTS);

export default function ProfileScreen() {
  const router = useRouter();
  const [nationality, setNationality] = useState("");
  const [search, setSearch] = useState("");
  const [hasDrone, setHasDrone] = useState(false);
  const [droneModel, setDroneModel] = useState("DJI Mini 4 Pro");
  const [showRequiredHints, setShowRequiredHints] = useState(false);
  const identityWiggle = useRef(new Animated.Value(0)).current;

  const filtered = NATIONALITIES.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const idpInfo = nationality ? getIdpStatus(nationality) : null;
  const visaFreeDays = nationality ? getVisaFreeDays(nationality) : 0;
  const missingNationality = showRequiredHints && !nationality;

  function triggerIdentityShake() {
    identityWiggle.setValue(0);
    Animated.sequence([
      Animated.timing(identityWiggle, {
        toValue: -10,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(identityWiggle, {
        toValue: 10,
        duration: 60,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(identityWiggle, {
        toValue: -8,
        duration: 55,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(identityWiggle, {
        toValue: 8,
        duration: 55,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(identityWiggle, {
        toValue: -4,
        duration: 45,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(identityWiggle, {
        toValue: 0,
        duration: 45,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function handleContinue() {
    if (!nationality) {
      setShowRequiredHints(true);
      triggerIdentityShake();
      return;
    }
    await handleFinish();
  }

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

  useEffect(() => {
    if (nationality) setShowRequiredHints(false);
  }, [nationality]);

  return (
    <ScreenSurface
      title="Travel Intake"
      subtitle="Establish the minimum profile needed to reduce ambiguity before you travel."
    >
      <View style={styles.heroCard}>
        <View style={styles.heroLine} />
        <Text style={styles.heroEyebrow}>Exclusive travel mode</Text>
        <Text style={styles.heroTitle}>TripGuard starts with a controlled profile, not a casual sign-up.</Text>
        <Text style={styles.heroBody}>
          The app uses your travel context to keep legal answers calmer, faster, and harder to misread.
        </Text>
      </View>

      <Animated.View style={{ transform: [{ translateX: identityWiggle }] }}>
        <View style={[styles.sectionCard, missingNationality && styles.sectionCardRequired]}>
        <SectionHeader
          eyebrow="Identity"
          title="Tell TripGuard who is arriving."
          detail="Nationality determines the first layer of license and visa guidance."
        />
        <TextInput
          style={[styles.searchInput, missingNationality && styles.searchInputRequired]}
          placeholder="Search nationality"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#8A7E70"
        />
        {missingNationality && (
          <Text style={styles.requiredHint}>Nationality is required before continuing.</Text>
        )}
        <ScrollView
          style={styles.optionScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {filtered.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.option, nationality === n && styles.optionSelected]}
              onPress={() => setNationality(n)}
            >
              <Text style={[styles.optionText, nationality === n && styles.optionTextSelected]}>
                {n}
              </Text>
              {nationality === n && <Text style={styles.check}>Selected</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </Animated.View>

      <View style={styles.sectionCard}>
        <SectionHeader
          eyebrow="Legal posture"
          title="Review the profile TripGuard will protect."
          detail="This is a briefing layer, not the final legal answer."
        />
        {!nationality ? (
          <Text style={styles.emptyNote}>Select a nationality to unlock the first legal briefing.</Text>
        ) : (
          <View style={styles.signalStack}>
            <View style={[styles.signalCard, idpInfo?.valid ? styles.signalSafe : styles.signalDanger]}>
              <Text style={styles.signalLabel}>Driving status</Text>
              <Text style={styles.signalTitle}>{idpInfo?.convention}</Text>
              <Text style={styles.signalBody}>{idpInfo?.note}</Text>
            </View>

            <View style={styles.signalCard}>
              <Text style={styles.signalLabel}>Entry posture</Text>
              <Text style={styles.signalTitle}>
                {visaFreeDays > 0 ? `${visaFreeDays} day window` : "Visa required"}
              </Text>
              <Text style={styles.signalBody}>
                {visaFreeDays > 0
                  ? `${nationality} travelers currently qualify for visa-free entry.`
                  : `${nationality} travelers should prepare visa handling before departure.`}
              </Text>
            </View>

            <View style={styles.droneRow}>
              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>Traveling with a drone</Text>
                <Switch
                  value={hasDrone}
                  onValueChange={setHasDrone}
                  trackColor={{ false: "#D9D0C3", true: "#C7D5FF" }}
                  thumbColor={hasDrone ? mobileTheme.colors.primary : "#FFFFFF"}
                />
              </View>
              {hasDrone && (
                <View style={styles.droneList}>
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
                        {droneModel === model && <Text style={styles.check}>Selected</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, styles.accessCard]}>
        <SectionHeader
          eyebrow="Access"
          title="Continue into TripGuard"
          detail="Confirm your profile details before you continue."
        />
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.revealPanel, missingNationality && styles.revealPanelRequired]}
          onPress={() => void handleContinue()}
        >
          <Text style={styles.revealTitle}>Continue</Text>
          <Text style={[styles.revealBody, missingNationality && styles.revealBodyRequired]}>
            Save your intake profile and proceed to the main app.
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    borderRadius: 28,
    padding: 20,
    gap: 10,
  },
  heroLine: {
    width: 64,
    height: 1,
    backgroundColor: "rgba(248, 244, 236, 0.3)",
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  heroBody: {
    color: "rgba(248, 244, 236, 0.78)",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 24,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
  },
  sectionCardRequired: {
    borderColor: "rgba(161, 46, 46, 0.42)",
    backgroundColor: "#FFF7F5",
  },
  accessCard: {
    marginBottom: 24,
  },
  optionScroll: {
    maxHeight: 260,
  },
  searchInput: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    borderColor: mobileTheme.colors.line,
    borderWidth: 1,
    marginBottom: 12,
    color: mobileTheme.colors.textPrimary,
  },
  searchInputRequired: {
    borderColor: "rgba(161, 46, 46, 0.58)",
    backgroundColor: "#FFF1EE",
  },
  requiredHint: {
    color: "#A12E2E",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: "600",
  },
  option: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
  },
  optionSelected: {
    borderColor: mobileTheme.colors.primary,
    backgroundColor: mobileTheme.colors.primarySoft,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
  },
  optionTextSelected: {
    color: mobileTheme.colors.primary,
    fontWeight: "700",
  },
  check: {
    color: mobileTheme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  signalStack: {
    gap: 12,
  },
  signalCard: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    gap: 6,
  },
  signalSafe: {
    backgroundColor: mobileTheme.colors.successSoft,
    borderColor: "rgba(31, 107, 87, 0.18)",
  },
  signalDanger: {
    backgroundColor: mobileTheme.colors.dangerSoft,
    borderColor: "rgba(161, 46, 46, 0.18)",
  },
  signalLabel: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  signalTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 17,
    fontWeight: "700",
  },
  signalBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyNote: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  droneRow: {
    gap: 12,
  },
  switchRow: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "600",
  },
  droneList: {
    gap: 8,
  },
  droneNote: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  revealPanel: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    gap: 6,
  },
  revealPanelActive: {
    borderColor: mobileTheme.colors.gold,
    backgroundColor: mobileTheme.colors.goldSoft,
  },
  revealPanelRequired: {
    borderColor: "rgba(161, 46, 46, 0.42)",
    backgroundColor: "#FFF1EE",
  },
  revealTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 16,
    fontWeight: "700",
  },
  revealBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  revealBodyRequired: {
    color: "#7C2B2B",
  },
  secondaryLink: {
    alignItems: "center",
    paddingVertical: 6,
  },
  secondaryLinkText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryLinkWarning: {
    color: "#A12E2E",
  },
});
