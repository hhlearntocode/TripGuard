import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

function AssistantGlass({ children }: { children: React.ReactNode }) {
  const inner = (
    <View style={styles.assistantInner}>{children}</View>
  );
  if (Platform.OS === "web") {
    return (
      <View style={[styles.assistantBubble, styles.assistantBubbleWeb]}>
        {inner}
      </View>
    );
  }
  return (
    <BlurView intensity={38} tint="light" style={styles.assistantBubble}>
      {inner}
    </BlurView>
  );
}

export default function ChatBubble({ role, content, isLoading }: Props) {
  const isUser = role === "user";

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <LinearGradient
          colors={["rgba(212, 175, 55, 0.35)", "rgba(94, 234, 212, 0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            <Ionicons name="shield-checkmark" size={16} color="#F8FAFC" />
          </View>
        </LinearGradient>
      )}
      {isUser ? (
        <LinearGradient
          colors={["rgba(56, 189, 172, 0.55)", "rgba(30, 58, 95, 0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{content}</Text>
        </LinearGradient>
      ) : (
        <AssistantGlass>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#0D9488" />
              <Text style={styles.loadingText}>Reviewing regulations…</Text>
            </View>
          ) : (
            <Text style={styles.assistantText}>{content}</Text>
          )}
        </AssistantGlass>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 2,
    marginRight: 10,
    alignSelf: "flex-end",
  },
  avatar: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  assistantBubble: {
    maxWidth: "78%",
    borderRadius: 22,
    overflow: "hidden",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  assistantBubbleWeb: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  assistantInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#F8FAFC",
    letterSpacing: 0.2,
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(248, 250, 252, 0.94)",
    letterSpacing: 0.15,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "rgba(248, 250, 252, 0.7)",
    fontSize: 14,
    fontStyle: "italic",
  },
});
