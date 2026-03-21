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
import { ChatThread, loadChatThreads } from "@/hooks/useChatHistory";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { deriveLegalityState, LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const FALLBACK_QUERY = "Can I fly a drone near a temple?";
const FALLBACK_PREVIEW = "Restricted. Cultural and religious sites often carry additional sensitivity and enforcement risk. Verify local restrictions and keep distance before flying.";

const PRODUCT_PILLARS = [
  {
    title: "Concise legal answers",
    body: "Ask one scenario and get a clear posture before you act.",
    icon: "chatbubble-ellipses-outline" as const,
  },
  {
    title: "Profile-aware readiness",
    body: "Nationality, visa posture, and travel gear reshape the answer.",
    icon: "compass-outline" as const,
  },
  {
    title: "Emergency fallback",
    body: "When the issue is no longer theoretical, TripGuard shifts to immediate steps.",
    icon: "flash-outline" as const,
  },
];

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

const VALUE_POINTS = [
  {
    title: "Source-grounded",
    body: "Answers are framed as legal information, not confident guesswork.",
  },
  {
    title: "Profile-aware",
    body: "The dashboard stays useful because it remembers who is traveling and with what constraints.",
  },
  {
    title: "Emergency-ready",
    body: "TripGuard can move from caution to action without changing tone or product surface.",
  },
];

interface LatestAssessment {
  chatId: string | null;
  question: string;
  preview: string;
  state: LegalityUiState;
}

function deriveLatestAssessment(threads: ChatThread[]): LatestAssessment {
  const latestThread = threads[0];
  if (!latestThread) {
    return {
      chatId: null,
      question: FALLBACK_QUERY,
      preview: FALLBACK_PREVIEW,
      state: deriveLegalityState(FALLBACK_PREVIEW),
    };
  }

  const lastAssistantIndex = [...latestThread.messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find((entry) => entry.message.role === "assistant")?.index;

  if (lastAssistantIndex === undefined) {
    return {
      chatId: latestThread.chat_id,
      question: latestThread.title || FALLBACK_QUERY,
      preview: FALLBACK_PREVIEW,
      state: deriveLegalityState(FALLBACK_PREVIEW),
    };
  }

  let question = latestThread.title || FALLBACK_QUERY;
  for (let i = lastAssistantIndex - 1; i >= 0; i -= 1) {
    if (latestThread.messages[i].role === "user") {
      question = latestThread.messages[i].content;
      break;
    }
  }

  const preview = latestThread.messages[lastAssistantIndex].content || FALLBACK_PREVIEW;
  return {
    chatId: latestThread.chat_id,
    question,
    preview,
    state:
      (latestThread.messages[lastAssistantIndex].state as LegalityUiState | undefined) ||
      deriveLegalityState(preview),
  };
}

export default function TravelSafetyScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<LatestAssessment>(() => ({
    chatId: null,
    question: FALLBACK_QUERY,
    preview: FALLBACK_PREVIEW,
    state: deriveLegalityState(FALLBACK_PREVIEW),
  }));

  useEffect(() => {
    loadUserProfile().then(setProfile);
    loadChatThreads().then((threads) => setLatestAssessment(deriveLatestAssessment(threads)));
  }, []);

  const restrictedText =
    latestAssessment.state === "warning" || latestAssessment.state === "restricted"
      ? "Recent checks suggest permits, location limits, or traveler-specific conditions."
      : "TripGuard narrows the border cases before they become a mistake at the checkpoint.";

  const riskText = profile?.has_drone
    ? "Drone travel, controlled zones, and customs scenarios should default to caution."
    : "Drug, customs, and restricted-zone scenarios should always be treated as high risk.";

  const allowedText = profile
    ? `${profile.nationality} profile loaded. Routine actions can be checked quickly without rebuilding context.`
    : "Low-risk questions belong here when you want confirmation before moving.";

  const latestStatusLabel = useMemo(() => {
    switch (latestAssessment.state) {
      case "safe":
        return "Verified Safe";
      case "warning":
        return "Restricted";
      case "restricted":
        return "High Risk";
      case "checking":
        return "Checking";
      default:
        return "Uncertain";
    }
  }, [latestAssessment.state]);

  return (
    <View style={styles.screen}>
      <ScreenSurface title="Travel Safety" subtitle="Clear legality signals before you act.">
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
          question={latestAssessment.question}
          preview={latestAssessment.preview}
          detail="TripGuard keeps the latest verified scenario here so the next decision starts from context, not memory."
          onReview={() =>
            router.push({
              pathname: "/(tabs)/chat",
              params: latestAssessment.chatId
                ? { chat_id: latestAssessment.chatId, query: latestAssessment.question }
                : { query: latestAssessment.question },
            })
          }
        />

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Capability"
            title="What the product does before uncertainty gets expensive"
            detail="This follows the same logic as the web landing: orient first, then narrow the decision."
          />

          <View style={styles.pillarGrid}>
            {PRODUCT_PILLARS.map((item) => (
              <View key={item.title} style={styles.pillarCard}>
                <View style={styles.pillarIcon}>
                  <Ionicons name={item.icon} size={18} color={mobileTheme.colors.primary} />
                </View>
                <Text style={styles.pillarTitle}>{item.title}</Text>
                <Text style={styles.pillarBody}>{item.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionDivider} />

          <SectionHeader
            eyebrow="Categories"
            title="Tap the area that feels uncertain"
            detail="These shortcuts route into the current chat engine without adding any new chat behavior."
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

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Risk framing"
            title="A mistake is rarely small"
            detail="These three postures mirror the web story section in a mobile decision format."
          />
          <View style={styles.statusStack}>
            <StatusSummaryBlock
              title="Allowed"
              tone="safe"
              body={allowedText}
              detail="Allowed still means scenario-specific verification. It is a posture, not a blanket permission."
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
              detail="High-risk categories should move the user toward explicit review or emergency guidance, not casual exploration."
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            eyebrow="Trust model"
            title="The same promise, compressed for mobile"
            detail="The app borrows the web’s trust logic without copying the web surface directly."
          />

          <View style={styles.valueGrid}>
            {VALUE_POINTS.map((item) => (
              <View key={item.title} style={styles.valueCard}>
                <Text style={styles.valueTitle}>{item.title}</Text>
                <Text style={styles.valueBody}>{item.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footerSignalWrap}>
            <View style={[styles.footerSignal, latestAssessment.state === "safe" && styles.footerSignalSafe]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={mobileTheme.colors.primary} />
              <Text style={styles.footerText}>Latest status: {latestStatusLabel}</Text>
            </View>
          </View>
        </View>
      </ScreenSurface>

      <PrimarySafetyFab
        onPrimaryPress={() => router.push("/(tabs)/chat")}
        onScanPress={() =>
          router.push({
            pathname: "/(tabs)/chat",
            params: { query: "I photographed a sign or notice in Vietnam. What does it mean?" },
          })
        }
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
    backgroundColor: "#F9F2EB",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    padding: 18,
    gap: 14,
    shadowColor: "#D7B7C8",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  pillarGrid: {
    gap: 12,
  },
  pillarCard: {
    borderRadius: 20,
    backgroundColor: "#FFF8FB",
    borderWidth: 1,
    borderColor: "#F7DEE8",
    padding: 16,
    gap: 8,
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E9EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pillarTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  pillarBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(16, 36, 59, 0.08)",
  },
  statusStack: {
    gap: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  valueGrid: {
    gap: 12,
  },
  valueCard: {
    borderRadius: 20,
    backgroundColor: "#F7F2EC",
    borderWidth: 1,
    borderColor: "#E7DCCF",
    padding: 16,
    gap: 6,
  },
  valueTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  valueBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  footerSignalWrap: {
    paddingTop: 2,
    paddingBottom: 82,
  },
  footerSignal: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EEF3FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#DDE6FF",
  },
  footerSignalSafe: {
    backgroundColor: mobileTheme.colors.successSoft,
    borderColor: "#CFE7D7",
  },
  footerText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
  },
});
