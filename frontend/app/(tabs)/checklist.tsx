import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ScreenSurface from "@/components/ui/ScreenSurface";
import SafetyQuestionCard from "@/components/ui/SafetyQuestionCard";
import StatusSummaryBlock from "@/components/ui/StatusSummaryBlock";
import RiskCategoryTile from "@/components/ui/RiskCategoryTile";
import PrimarySafetyFab from "@/components/ui/PrimarySafetyFab";
import SectionHeader from "@/components/ui/SectionHeader";
import { loadChatHistory, ChatHistoryEntry } from "@/hooks/useChatHistory";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { deriveLegalityState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const FALLBACK_QUERY = "Can I fly a drone near a temple?";
const FALLBACK_PREVIEW = "⚠️ Restricted. Cultural and religious sites often carry additional sensitivity and enforcement risk. Verify local restrictions and keep distance before flying.";

const CATEGORY_ITEMS = [
  {
    title: "Drugs",
    detail: "Possession and testing risks",
    icon: "flask-outline" as const,
    query: "What are the legal risks if I carry or use drugs in Vietnam?",
  },
  {
    title: "Drone usage",
    detail: "Permits, altitude, location",
    icon: "airplane-outline" as const,
    query: "Can I fly a drone here and what permits do I need?",
  },
  {
    title: "Cultural sensitivity",
    detail: "Temples, dress, conduct",
    icon: "library-outline" as const,
    query: "Is this behavior culturally or legally sensitive near a temple?",
  },
  {
    title: "Restricted zones",
    detail: "Military and controlled areas",
    icon: "location-outline" as const,
    query: "Is this area restricted for foreigners or filming?",
  },
  {
    title: "Customs / border rules",
    detail: "Import and arrival checks",
    icon: "briefcase-outline" as const,
    query: "Can I bring this item into Vietnam through customs?",
  },
];

export default function TravelSafetyScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestEntry, setLatestEntry] = useState<ChatHistoryEntry | null>(null);

  useEffect(() => {
    loadUserProfile().then(setProfile);
    loadChatHistory().then((entries) => setLatestEntry(entries[0] || null));
  }, []);

  const question = latestEntry?.query || FALLBACK_QUERY;
  const preview = latestEntry?.preview || FALLBACK_PREVIEW;
  const latestState = useMemo(() => deriveLegalityState(preview), [preview]);

  const allowedText = profile
    ? `${profile.nationality} profile loaded. Use this for low-risk checks and simple confirmations.`
    : "Use this when you expect the action to be routine, but still want confirmation first.";

  const restrictedText = latestState === "warning" || latestState === "restricted"
    ? "Recent checks suggest some actions need conditions, permits, or location awareness."
    : "TripGuard will classify borderline cases here before they become a mistake.";

  const riskText = profile?.has_drone
    ? "Drone travel, controlled zones, and customs scenarios deserve immediate caution."
    : "Drug, customs, and restricted-zone scenarios should always be treated as high risk.";

  return (
    <View style={styles.screen}>
      <ScreenSurface
        title="Travel Safety"
        subtitle="Clear legality signals before you act."
      >
        <View style={styles.topBarActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Search legal checks"
            style={styles.headerAction}
            onPress={() => router.push("/(tabs)/chat")}
          >
            <Ionicons name="search-outline" size={18} color={mobileTheme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open travel profile"
            style={styles.headerAction}
            onPress={() => router.push("/onboarding/profile")}
          >
            <Ionicons name="person-outline" size={18} color={mobileTheme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <SafetyQuestionCard
          question={question}
          preview={preview}
          detail="TripGuard stores the latest assessed scenario here so the user can resume a safety decision without reconstructing context."
          onReview={() => router.push({ pathname: "/(tabs)/chat", params: { query: question } })}
        />

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Status overview"
            title="Three immediate legal postures"
            detail="These replace generic watchlist cards with faster decision labels."
          />
          <View style={styles.statusStack}>
            <StatusSummaryBlock
              title="Allowed"
              tone="safe"
              body={allowedText}
              detail="TripGuard still expects the user to verify the exact scenario before acting. Allowed does not mean unreviewed."
            />
            <StatusSummaryBlock
              title="Restricted"
              tone="warning"
              body={restrictedText}
              detail="Restricted scenarios usually need permit checks, location checks, or traveler-specific conditions."
            />
            <StatusSummaryBlock
              title="High Risk"
              tone="danger"
              body={riskText}
              detail="High-risk categories should push the user toward explicit scenario review or emergency guidance, not casual exploration."
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Legal categories"
            title="Tap the area that feels uncertain"
            detail="Each category opens a prefilled legality question to reduce friction under stress."
          />
          <View style={styles.categoryGrid}>
            {CATEGORY_ITEMS.map((item) => (
              <RiskCategoryTile
                key={item.title}
                title={item.title}
                detail={item.detail}
                icon={item.icon}
                onPress={() => router.push({ pathname: "/(tabs)/chat", params: { query: item.query } })}
              />
            ))}
          </View>
        </View>

        <View style={styles.statusFooter}>
          <View style={[styles.footerSignal, latestState === "safe" && styles.footerSignalSafe]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={mobileTheme.colors.primary} />
            <Text style={styles.footerText}>
              Latest status: {latestState === "safe" ? "Verified Safe" : latestState === "warning" ? "Restricted" : latestState === "restricted" ? "High Risk" : "Uncertain"}
            </Text>
          </View>
        </View>
      </ScreenSurface>

      <PrimarySafetyFab
        onPrimaryPress={() => router.push("/(tabs)/chat")}
        onScanPress={() => router.push({ pathname: "/(tabs)/chat", params: { entry: "scan" } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBarActions: {
    position: "absolute",
    top: 18,
    right: 20,
    flexDirection: "row",
    gap: 10,
    zIndex: 20,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFFE8",
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    padding: 18,
    gap: 14,
  },
  statusStack: {
    gap: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusFooter: {
    paddingBottom: 82,
  },
  footerSignal: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: mobileTheme.colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerSignalSafe: {
    backgroundColor: mobileTheme.colors.successSoft,
  },
  footerText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
  },
});
