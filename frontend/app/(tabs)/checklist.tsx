import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";
import ScreenSurface from "@/components/ui/ScreenSurface";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import { mobileTheme } from "@/theme/mobileTheme";

interface CheckItem {
  id: string;
  title: string;
  status: "ok" | "warning" | "error";
  detail: string;
  law?: string;
}

function buildChecklist(profile: UserProfile): CheckItem[] {
  const items: CheckItem[] = [];
  const idp = getIdpStatus(profile.nationality);

  items.push({
    id: "idp",
    title: "International Driving Permit",
    status: idp.valid ? "ok" : "error",
    detail: idp.note,
    law: "NĐ 168/2024/NĐ-CP Điều 5",
  });

  const visaDays = getVisaFreeDays(profile.nationality);
  if (visaDays > 0) {
    items.push({
      id: "visa",
      title: "Visa / Entry",
      status: "ok",
      detail: `${visaDays} days visa-free for ${profile.nationality} citizens`,
      law: "Immigration Law 2014",
    });
  } else {
    items.push({
      id: "visa",
      title: "Visa / Entry",
      status: "error",
      detail: `${profile.nationality} citizens require an e-visa before arrival`,
      law: "NĐ 07/2023/NĐ-CP",
    });
  }

  if (profile.has_drone) {
    const droneInfo = DRONE_WEIGHTS[profile.drone_model] || DRONE_WEIGHTS.Other;
    items.push({
      id: "drone",
      title: `Drone: ${profile.drone_model}`,
      status: droneInfo.requiresPermit ? "error" : "ok",
      detail: droneInfo.requiresPermit
        ? `${droneInfo.weight}g — permit and local sponsor should be assumed`
        : `${droneInfo.weight}g — under 250g threshold`,
      law: "NĐ 288/2025/NĐ-CP",
    });
  }

  items.push({
    id: "helmet",
    title: "Motorbike Helmet",
    status: "warning",
    detail: "Mandatory for all riders. Enforcement is routine.",
    law: "NĐ 168/2024/NĐ-CP",
  });

  items.push({
    id: "alcohol",
    title: "Alcohol Limit",
    status: "warning",
    detail: "Any detectable alcohol level while driving is risky.",
    law: "NĐ 168/2024/NĐ-CP",
  });

  items.push({
    id: "drugs",
    title: "Drug Laws",
    status: "warning",
    detail: "TripGuard treats drug scenarios as high-risk by default.",
    law: "Bộ luật Hình sự 2015",
  });

  return items;
}

const STATUS_ICONS = {
  ok: { icon: "checkmark-circle-outline", color: mobileTheme.colors.success, bg: mobileTheme.colors.successSoft },
  warning: { icon: "alert-circle-outline", color: mobileTheme.colors.warning, bg: mobileTheme.colors.warningSoft },
  error: { icon: "close-circle-outline", color: mobileTheme.colors.danger, bg: mobileTheme.colors.dangerSoft },
};

const QUICK_INTENTS = [
  "Can I bring this into Vietnam?",
  "Is this area restricted?",
  "What happens if I do this?",
];

export default function BriefingScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  if (!profile) {
    return (
      <ScreenSurface
        title="Travel Briefing"
        subtitle="TripGuard needs a profile before it can establish a legal posture."
        scrollable={false}
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Profile required</Text>
          <Text style={styles.emptyBody}>Set up protected access to unlock your travel briefing.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/onboarding/profile")}>
            <Text style={styles.primaryButtonText}>Open intake</Text>
          </TouchableOpacity>
        </View>
      </ScreenSurface>
    );
  }

  const items = buildChecklist(profile);
  const errors = items.filter((i) => i.status === "error").length;
  const warnings = items.filter((i) => i.status === "warning").length;
  const readinessState = errors > 0 ? "restricted" : warnings > 0 ? "warning" : "safe";
  const topSignals = items.slice(0, 4);

  return (
    <ScreenSurface
      title="Travel Briefing"
      subtitle="Orient yourself before you ask a specific legal question."
      rightNode={<StatusPill state={readinessState} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>
          {profile.trust_tier === "protected" ? "Protected system active" : "Standard mode"}
        </Text>
        <Text style={styles.heroTitle}>
          {errors > 0
            ? "There are immediate legal exposures in your travel profile."
            : warnings > 0
              ? "Your trip is broadly viable, but a few conditions need attention."
              : "Your profile is currently in a clear travel posture."}
        </Text>
        <Text style={styles.heroBody}>
          TripGuard uses this briefing as a pre-check layer. Use the Check screen for scenario-specific legality.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader
          eyebrow="Core journey"
          title="Start from a clear question, not broad browsing."
          detail="TripGuard is strongest when you enter the decision you are about to make."
        />
        <View style={styles.intentGrid}>
          {QUICK_INTENTS.map((intent) => (
            <TouchableOpacity
              key={intent}
              style={styles.intentCard}
              onPress={() => router.push({ pathname: "/(tabs)/chat", params: { query: intent } })}
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color={mobileTheme.colors.primary} />
              <Text style={styles.intentText}>{intent}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader
          eyebrow="Watchlist"
          title="What TripGuard wants you to notice first."
          detail="These are profile-level signals worth resolving before high-risk activity."
        />
        <View style={styles.signalList}>
          {topSignals.map((item) => {
            const s = STATUS_ICONS[item.status];
            return (
              <View key={item.id} style={styles.signalRow}>
                <View style={[styles.signalIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <View style={styles.signalCopy}>
                  <Text style={styles.signalTitle}>{item.title}</Text>
                  <Text style={styles.signalDetail}>{item.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <SectionHeader
          eyebrow="Profile"
          title="Briefing context"
          detail="This is the context TripGuard is using before it evaluates your next scenario."
        />
        <View style={styles.profileGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Nationality</Text>
            <Text style={styles.metricValue}>{profile.nationality}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Driving</Text>
            <Text style={styles.metricValue}>{getIdpStatus(profile.nationality).convention}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Visa</Text>
            <Text style={styles.metricValue}>
              {getVisaFreeDays(profile.nationality) > 0 ? `${getVisaFreeDays(profile.nationality)} days` : "Required"}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Drone</Text>
            <Text style={styles.metricValue}>
              {profile.has_drone ? `${DRONE_WEIGHTS[profile.drone_model]?.weight || "?"}g` : "None"}
            </Text>
          </View>
        </View>
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
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
  },
  intentGrid: {
    gap: 10,
  },
  intentCard: {
    backgroundColor: mobileTheme.colors.primarySoft,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  intentText: {
    flex: 1,
    color: mobileTheme.colors.primary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "600",
  },
  signalList: {
    gap: 12,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  signalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  signalCopy: {
    flex: 1,
    gap: 4,
  },
  signalTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  signalDetail: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  metricValue: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 28,
    fontWeight: "700",
  },
  emptyBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 6,
  },
  primaryButtonText: {
    color: mobileTheme.colors.textOnDark,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
