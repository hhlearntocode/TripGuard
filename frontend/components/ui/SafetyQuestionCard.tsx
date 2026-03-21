import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import StatusPill from "@/components/ui/StatusPill";
import { deriveLegalityState, LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

interface SafetyQuestionCardProps {
  question: string;
  preview: string;
  detail?: string;
  onReview: () => void;
}

export default function SafetyQuestionCard({
  question,
  preview,
  detail,
  onReview,
}: SafetyQuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const state = useMemo<LegalityUiState>(() => deriveLegalityState(preview), [preview]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Expand latest safety check"
      onPress={() => setExpanded((current) => !current)}
      style={({ pressed }) => [
        styles.card,
        expanded && styles.cardExpanded,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.questionWrap}>
          <Text style={styles.overline}>Latest safety check</Text>
          <Text style={styles.question}>{question}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#9F1D47"
        />
      </View>

      <View style={styles.previewPanel}>
        <Text style={styles.preview} numberOfLines={expanded ? undefined : 2}>
          {preview}
        </Text>
        <StatusPill state={state} />
      </View>

      {expanded && (
        <View style={styles.detailBlock}>
          <Text style={styles.detailText}>
            {detail || "Open the full check to review the exact legal framing, consequence, and follow-up action."}
          </Text>
          <TouchableOpacity style={styles.reviewButton} onPress={onReview}>
            <Text style={styles.reviewButtonText}>Review in Check</Text>
            <Ionicons name="arrow-forward" size={16} color={mobileTheme.colors.textOnDark} />
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFD7E2",
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: "#F18DA7",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 7,
    borderWidth: 1,
    borderColor: "#FBE8EE",
  },
  cardExpanded: {
    shadowOpacity: 0.42,
    elevation: 9,
  },
  cardPressed: {
    opacity: 0.97,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  questionWrap: {
    flex: 1,
    gap: 6,
  },
  overline: {
    color: "#9F1D47",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  question: {
    color: "#5B1230",
    fontFamily: mobileTheme.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  previewPanel: {
    backgroundColor: "#FFF6F8",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 2,
  },
  preview: {
    color: "#6F3046",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  detailBlock: {
    gap: 12,
  },
  detailText: {
    color: "#6F3046",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  reviewButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewButtonText: {
    color: mobileTheme.colors.textOnDark,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
