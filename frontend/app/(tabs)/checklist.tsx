import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";
import { COLORS } from "@/constants/theme";

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
  items.push({
    id: "visa",
    title: "Visa / Entry",
    status: visaDays > 0 ? "ok" : "error",
    detail: visaDays > 0
      ? `${visaDays} days visa-free for ${profile.nationality} citizens`
      : `${profile.nationality} citizens require an e-visa — evisa.xuatnhapcanh.gov.vn`,
    law: "NĐ 07/2023/NĐ-CP",
  });

  if (profile.has_drone) {
    const droneInfo = DRONE_WEIGHTS[profile.drone_model] || DRONE_WEIGHTS["Other"];
    items.push({
      id: "drone",
      title: `Drone: ${profile.drone_model}`,
      status: droneInfo.requiresPermit ? "error" : "ok",
      detail: droneInfo.requiresPermit
        ? `${droneInfo.weight}g — requires permit + Vietnamese organization sponsor`
        : `${droneInfo.weight}g — under 250g, no permit needed`,
      law: "NĐ 288/2025/NĐ-CP",
    });
  }

  items.push({
    id: "helmet",
    title: "Motorbike Helmet",
    status: "warning",
    detail: "Mandatory for all riders — fine 400,000–600,000 VND",
    law: "NĐ 168/2024/NĐ-CP",
  });

  items.push({
    id: "alcohol",
    title: "Alcohol Limit",
    status: "warning",
    detail: "Zero tolerance — any detectable alcohol level is illegal while driving",
    law: "NĐ 168/2024/NĐ-CP",
  });

  items.push({
    id: "drugs",
    title: "Drug Laws",
    status: "warning",
    detail: "Extremely strict — possession carries 2–20 year prison sentences",
    law: "Bộ luật Hình sự 2015",
  });

  return items;
}

const STATUS = {
  ok:      { icon: "checkmark-circle" as const, color: COLORS.ok,   glass: COLORS.okGlass,   border: COLORS.okBorder   },
  warning: { icon: "warning"          as const, color: COLORS.warn, glass: COLORS.warnGlass, border: COLORS.warnBorder },
  error:   { icon: "close-circle"    as const, color: COLORS.error, glass: COLORS.errorGlass, border: COLORS.errorBorder },
};

export default function ChecklistScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  if (!profile) {
    return (
      <LinearGradient colors={[COLORS.bg, COLORS.bg2]} style={styles.root}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.centerText}>Complete onboarding to see your checklist.</Text>
          <TouchableOpacity style={styles.setupBtn} onPress={() => router.push("/onboarding/profile")}>
            <Text style={styles.setupBtnText}>Set up profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const items = buildChecklist(profile);
  const errors = items.filter((i) => i.status === "error").length;
  const warnings = items.filter((i) => i.status === "warning").length;
  const oks = items.filter((i) => i.status === "ok").length;

  return (
    <LinearGradient colors={[COLORS.bg, "#0F1E35", COLORS.bg2]} style={styles.root}>
      {/* Header */}
      <BlurView intensity={50} tint="dark" style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Travel Checklist</Text>
        <Text style={styles.headerSub}>{profile.nationality} citizen</Text>
      </BlurView>

      {/* Summary pills */}
      <View style={styles.summary}>
        {errors > 0 && (
          <View style={[styles.pill, { backgroundColor: COLORS.errorGlass, borderColor: COLORS.errorBorder }]}>
            <Text style={[styles.pillText, { color: COLORS.error }]}>{errors} issue{errors > 1 ? "s" : ""} ❌</Text>
          </View>
        )}
        {warnings > 0 && (
          <View style={[styles.pill, { backgroundColor: COLORS.warnGlass, borderColor: COLORS.warnBorder }]}>
            <Text style={[styles.pillText, { color: COLORS.warn }]}>{warnings} warning{warnings > 1 ? "s" : ""} ⚠️</Text>
          </View>
        )}
        {oks > 0 && (
          <View style={[styles.pill, { backgroundColor: COLORS.okGlass, borderColor: COLORS.okBorder }]}>
            <Text style={[styles.pillText, { color: COLORS.ok }]}>{oks} ok ✅</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const s = STATUS[item.status];
          return (
            <View key={item.id} style={[styles.card, { borderColor: s.border, backgroundColor: s.glass }]}>
              <View style={[styles.iconWrap, { backgroundColor: s.glass, borderColor: s.border }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDetail}>{item.detail}</Text>
                {item.law && <Text style={styles.cardLaw}>⚖️ {item.law}</Text>}
              </View>
            </View>
          );
        })}
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
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  summary: {
    flexDirection: "row",
    padding: 14,
    paddingBottom: 6,
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: { fontSize: 13, fontWeight: "700" },

  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  cardDetail: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  cardLaw: { fontSize: 11, color: COLORS.textMuted, marginTop: 5 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  centerText: { fontSize: 16, color: COLORS.textSecondary, textAlign: "center", marginBottom: 24 },
  setupBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  setupBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
