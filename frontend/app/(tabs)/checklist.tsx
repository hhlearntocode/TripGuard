import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
} from "react-native";
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

  // IDP / License check
  const idp = getIdpStatus(profile.nationality);
  items.push({
    id: "idp",
    title: "International Driving Permit",
    status: idp.valid ? "ok" : "error",
    detail: idp.note,
    law: "NĐ 168/2024/NĐ-CP Điều 5",
  });

  // Visa check
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
      law: "NĐ 07/2023/NĐ-CP",
    });
  }

  // Drone check
  if (profile.has_drone) {
    const droneInfo = DRONE_WEIGHTS[profile.drone_model] || DRONE_WEIGHTS["Other"];
    if (droneInfo.requiresPermit) {
      items.push({
        id: "drone",
        title: `Drone: ${profile.drone_model}`,
        status: "error",
        detail: `${droneInfo.weight}g — requires permit + Vietnamese organization sponsor before flying`,
        law: "NĐ 288/2025/NĐ-CP",
      });
    } else {
      items.push({
        id: "drone",
        title: `Drone: ${profile.drone_model}`,
        status: "ok",
        detail: `${droneInfo.weight}g — under 250g limit, no permit needed`,
        law: "NĐ 288/2025/NĐ-CP",
      });
    }
  }

  // General reminders
  items.push({
    id: "helmet",
    title: "Motorbike Helmet",
    status: "warning",
    detail: "Mandatory for all riders — fine 400,000–600,000 VND if not worn",
    law: "NĐ 168/2024/NĐ-CP",
  });

  items.push({
    id: "alcohol",
    title: "Alcohol Limit",
    status: "warning",
    detail: "Zero tolerance for drink driving — any detectable alcohol level is illegal",
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

const STATUS_ICONS = {
  ok:      { icon: "checkmark-circle",  color: "#10B981", bg: "#D1FAE5" },
  warning: { icon: "warning",           color: "#F59E0B", bg: "#FEF3C7" },
  error:   { icon: "close-circle",      color: "#EF4444", bg: "#FEE2E2" },
};

export default function ChecklistScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.centerText}>Complete onboarding to see your checklist.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.push("/onboarding/profile")}>
            <Text style={styles.btnText}>Set up profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = buildChecklist(profile);
  const errors = items.filter((i) => i.status === "error").length;
  const warnings = items.filter((i) => i.status === "warning").length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Travel Checklist</Text>
        <Text style={styles.headerSub}>{profile.nationality} citizen</Text>
      </View>

      {/* Summary bar */}
      <View style={styles.summary}>
        {errors > 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.summaryText, { color: "#DC2626" }]}>{errors} issue{errors > 1 ? "s" : ""} ❌</Text>
          </View>
        )}
        {warnings > 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.summaryText, { color: "#D97706" }]}>{warnings} warning{warnings > 1 ? "s" : ""} ⚠️</Text>
          </View>
        )}
        {errors === 0 && warnings === 0 && (
          <View style={[styles.summaryBadge, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.summaryText, { color: "#059669" }]}>All clear ✅</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => {
          const s = STATUS_ICONS[item.status];
          return (
            <View key={item.id} style={[styles.card, { borderLeftColor: s.color }]}>
              <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={22} color={s.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDetail}>{item.detail}</Text>
                {item.law && <Text style={styles.cardLaw}>Source: {item.law}</Text>}
              </View>
            </View>
          );
        })}
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
  headerSub: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  summary: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    flexWrap: "wrap",
  },
  summaryBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryText: { fontSize: 13, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  cardDetail: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  cardLaw: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  centerText: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#14B8A6", padding: 14, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
