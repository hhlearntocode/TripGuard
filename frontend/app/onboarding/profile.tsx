import React, { useEffect, useState } from "react";
import {
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
import HoldToConfirm from "@/components/ui/HoldToConfirm";
import { AccessFlowState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const DRONE_MODELS = Object.keys(DRONE_WEIGHTS);

export default function ProfileScreen() {
  const router = useRouter();
  const [nationality, setNationality] = useState("");
  const [search, setSearch] = useState("");
  const [hasDrone, setHasDrone] = useState(false);
  const [droneModel, setDroneModel] = useState("DJI Mini 4 Pro");
  const [accessFlow, setAccessFlow] = useState<AccessFlowState>("sealed");

  const filtered = NATIONALITIES.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const idpInfo = nationality ? getIdpStatus(nationality) : null;
  const visaFreeDays = nationality ? getVisaFreeDays(nationality) : 0;

  async function handleFinish(trustTier: "observer" | "protected") {
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
      trust_tier: trustTier,
    });
    router.replace("/(tabs)/checklist");
  }

  useEffect(() => {
    if (accessFlow !== "granted") return;
    handleFinish("protected");
  }, [accessFlow]);

  return (
    <ScreenSurface
      title="Protected Access Intake"
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

      <View style={styles.sectionCard}>
        <SectionHeader
          eyebrow="Identity"
          title="Tell TripGuard who is arriving."
          detail="Nationality determines the first layer of license and visa guidance."
        />
        <ScrollView style={styles.optionScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.searchInput}
            placeholder="Search nationality"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#8A7E70"
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
              {nationality === n && <Text style={styles.check}>Selected</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
          eyebrow="Protected mode"
          title="Enter through a deliberate access gate."
          detail="This is not a decorative CTA. Holding the control confirms you want TripGuard to operate in protected mode."
        />

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.revealPanel, accessFlow === "revealing" && styles.revealPanelActive]}
          onPress={() => setAccessFlow("revealing")}
        >
          <Text style={styles.revealTitle}>
            {accessFlow === "sealed" ? "Reveal protected access" : "Protected access ready"}
          </Text>
          <Text style={styles.revealBody}>
            {accessFlow === "sealed"
              ? "Open the gate when the profile looks correct."
              : "Hold to confirm. This stores your trust tier locally and takes you into the app."}
          </Text>
        </TouchableOpacity>

        {accessFlow === "revealing" && (
          <HoldToConfirm
            label="Hold to enter protected mode"
            hint={nationality ? "Press and hold for a deliberate entry." : "Select nationality before protected mode is available."}
            disabled={!nationality}
            onConfirm={() => setAccessFlow("granted")}
          />
        )}

        <TouchableOpacity
          style={styles.secondaryLink}
          disabled={!nationality}
          onPress={() => handleFinish("observer")}
        >
          <Text style={[styles.secondaryLinkText, !nationality && styles.secondaryLinkDisabled]}>
            Continue with standard access
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
  secondaryLinkDisabled: {
    color: "#A49787",
  },
});
