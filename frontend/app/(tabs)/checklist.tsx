import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { getIdpStatus, getVisaFreeDays, DRONE_WEIGHTS } from "@/constants/legal";

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
    law: "ND 168/2024/ND-CP Art. 5",
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
      detail: `${profile.nationality} citizens require an e-visa — apply at evisa.xuatnhapcanh.gov.vn`,
      law: "ND 07/2023/ND-CP",
    });
  }

  if (profile.has_drone) {
    const droneInfo = DRONE_WEIGHTS[profile.drone_model] || DRONE_WEIGHTS["Other"];
    if (droneInfo.requiresPermit) {
      items.push({
        id: "drone",
        title: `Drone: ${profile.drone_model}`,
        status: "error",
        detail: `${droneInfo.weight}g — requires permit + Vietnamese organization sponsor before flying`,
        law: "ND 288/2025/ND-CP",
      });
    } else {
      items.push({
        id: "drone",
        title: `Drone: ${profile.drone_model}`,
        status: "ok",
        detail: `${droneInfo.weight}g — under 250g limit, no permit needed`,
        law: "ND 288/2025/ND-CP",
      });
    }
  }

  items.push({
    id: "helmet",
    title: "Motorbike Helmet",
    status: "warning",
    detail: "Mandatory for all riders — fine 400,000-600,000 VND if not worn",
    law: "ND 168/2024/ND-CP",
  });

  items.push({
    id: "alcohol",
    title: "Alcohol Limit",
    status: "warning",
    detail: "Zero tolerance for drink driving — any detectable alcohol level is illegal",
    law: "ND 168/2024/ND-CP",
  });

  items.push({
    id: "drugs",
    title: "Drug Laws",
    status: "warning",
    detail: "Extremely strict — possession carries 2-20 year prison sentences",
    law: "Penal Code 2015",
  });

  return items;
}

const STATUS_CONFIG = {
  ok:      { icon: "checkmark-circle" as const, color: "#10B981", bgColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.2)" },
  warning: { icon: "warning" as const,          color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.2)" },
  error:   { icon: "close-circle" as const,     color: "#EF4444", bgColor: "rgba(239,68,68,0.12)",  borderColor: "rgba(239,68,68,0.2)" },
};

export default function ChecklistScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  if (!profile) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#0A0F1C", "#0D1B2A", "#122333"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.center}>
          <Ionicons name="person-outline" size={40} color="rgba(255,255,255,0.3)" />
          <Text style={styles.centerText}>Complete onboarding to see your checklist.</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push("/onboarding/profile")}
          >
            <LinearGradient colors={["#14B8A6", "#0D9488"]} style={styles.ctaGradient}>
              <Text style={styles.ctaBtnText}>Set up profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const items = buildChecklist(profile);
  const errors = items.filter((i) => i.status === "error").length;
  const warnings = items.filter((i) => i.status === "warning").length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0F1C", "#0D1B2A", "#122333", "#0D1B2A"]}
        style={StyleSheet.absoluteFill}
      />

      <BlurView intensity={40} tint="dark" style={styles.headerBlur}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Travel Checklist</Text>
          <Text style={styles.headerSub}>{profile.nationality} citizen</Text>
        </View>
      </BlurView>

      <View style={styles.summary}>
        {errors > 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.2)" }]}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={[styles.summaryText, { color: "#EF4444" }]}>{errors} issue{errors > 1 ? "s" : ""}</Text>
          </View>
        )}
        {warnings > 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.2)" }]}>
            <Ionicons name="warning" size={14} color="#F59E0B" />
            <Text style={[styles.summaryText, { color: "#F59E0B" }]}>{warnings} warning{warnings > 1 ? "s" : ""}</Text>
          </View>
        )}
        {errors === 0 && warnings === 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.2)" }]}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={[styles.summaryText, { color: "#10B981" }]}>All clear</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const s = STATUS_CONFIG[item.status];
          return (
            <View key={item.id} style={[styles.card, { borderLeftColor: s.color }]}>
              <View style={[styles.iconWrap, { backgroundColor: s.bgColor }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDetail}>{item.detail}</Text>
                {item.law && <Text style={styles.cardLaw}>{item.law}</Text>}
              </View>
            </View>
          );
        })}
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
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: "500" },
  summary: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    flexWrap: "wrap",
  },
  summaryBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryText: { fontSize: 13, fontWeight: "700" },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#F8FAFC", marginBottom: 4 },
  cardDetail: { fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 20 },
  cardLaw: { fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6, fontWeight: "500" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  centerText: { fontSize: 16, color: "rgba(255,255,255,0.5)", textAlign: "center" },
  ctaBtn: { borderRadius: 14, overflow: "hidden" },
  ctaGradient: { paddingHorizontal: 28, paddingVertical: 14 },
  ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
