import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

interface Props {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

export default function ChatBubble({ role, content, isLoading }: Props) {
  const isUser = role === "user";

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>TG</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#14B8A6" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        ) : (
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {content}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    alignSelf: "flex-end",
  },
  avatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: "#14B8A6",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: "#1F2937",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
