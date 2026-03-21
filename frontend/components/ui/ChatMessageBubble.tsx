import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

interface ChatMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  state?: LegalityUiState;
}

export default function ChatMessageBubble({
  role,
  content,
  state,
}: ChatMessageBubbleProps) {
  const isUser = role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubbleWrap, isUser ? styles.wrapUser : styles.wrapAssistant]}>
        {!isUser && (
          <View style={styles.assistantMeta}>
            <View style={styles.assistantDot} />
            <Text style={styles.assistantLabel}>TripGuard</Text>
            {!!state && <Text style={styles.assistantState}>{formatState(state)}</Text>}
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {content}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatState(state: LegalityUiState) {
  switch (state) {
    case "safe":
      return "Verified Safe";
    case "warning":
      return "Warning";
    case "restricted":
      return "Restricted";
    case "checking":
      return "Checking";
    default:
      return "Uncertain";
  }
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginBottom: 14,
  },
  rowUser: {
    alignItems: "flex-end",
  },
  rowAssistant: {
    alignItems: "flex-start",
  },
  bubbleWrap: {
    maxWidth: "84%",
    gap: 6,
  },
  wrapUser: {
    alignItems: "flex-end",
  },
  wrapAssistant: {
    alignItems: "flex-start",
  },
  assistantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  assistantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: mobileTheme.colors.primary,
  },
  assistantLabel: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
  },
  assistantState: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "600",
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  userBubble: {
    backgroundColor: "#274EDE",
    borderBottomRightRadius: 10,
  },
  assistantBubble: {
    backgroundColor: "#F4EEE7",
    borderWidth: 1,
    borderColor: "#E7DCCF",
    borderBottomLeftRadius: 10,
  },
  text: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: mobileTheme.colors.textPrimary,
  },
});
