import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { appendChatHistory, ChatHistoryEntry } from "@/hooks/useChatHistory";
import ScreenSurface from "@/components/ui/ScreenSurface";
import ChatSettingsSheet from "@/components/ui/ChatSettingsSheet";
import ChatMessageBubble from "@/components/ui/ChatMessageBubble";
import { deriveLegalityState, LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  state?: LegalityUiState;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ query?: string; entry?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const starterPrompts = useMemo(
    () => [
      "Can I fly a drone near a temple?",
      "Can I bring prescription medicine into Vietnam?",
      "What happens if I overstay my visa?",
    ],
    []
  );

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (!params.query || Array.isArray(params.query)) return;
    setInput(params.query);
  }, [params.query]);

  useEffect(() => {
    if (params.entry !== "scan") return;
    pickImage();
  }, [params.entry]);

  const persistHistory = async (query: string, answer: string) => {
    const entry: ChatHistoryEntry = {
      id: Date.now().toString(),
      query,
      preview: answer.replace(/\s+/g, " ").trim().slice(0, 120),
      created_at: new Date().toISOString(),
    };
    await appendChatHistory(entry);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !profile) return;

    const userMessage: Message = {
      id: `user-${Date.now().toString()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          user_profile: profile,
          conversation_history: history,
        }),
      });
      const data = await resp.json();
      const answer = data.answer || "TripGuard could not classify this scenario.";
      const state = deriveLegalityState(answer);
      const assistantMessage: Message = {
        id: `assistant-${Date.now().toString()}`,
        role: "assistant",
        content: answer,
        state,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await persistHistory(text, answer);
    } catch (e) {
      const fallback = "TripGuard could not verify the scenario right now. Check your connection and retry.";
      const assistantMessage: Message = {
        id: `assistant-${Date.now().toString()}`,
        role: "assistant",
        content: fallback,
        state: "warning",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await persistHistory(text, fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to identify traffic signs.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0].base64) return;

    const b64 = result.assets[0].base64;
    setIsLoading(true);

    try {
      const visionResp = await fetch(`${API_URL}/api/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: b64 }),
      });
      const sign = await visionResp.json();

      let message = "I photographed a Vietnamese traffic sign.";
      if (sign.code) {
        message = `I photographed a sign: ${sign.code} ${sign.name} — ${sign.meaning}. What does this mean for me and what are the consequences if I violate it?`;
      }
      setIsLoading(false);
      await sendMessage(message);
    } catch (e) {
      setIsLoading(false);
      Alert.alert("Error", "Could not identify sign.");
    }
  };

  return (
    <ScreenSurface
      title="Check"
      subtitle="Ask one scenario at a time."
      rightNode={<ChatSettingsSheet currentQuery={input} />}
      scrollable={false}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.stream}
            contentContainerStyle={styles.streamContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyBadge}>
                  <View style={styles.emptyBadgeDot} />
                  <Text style={styles.emptyBadgeText}>TripGuard</Text>
                </View>
                <Text style={styles.emptyTitle}>Describe the situation you want checked.</Text>
                <Text style={styles.emptyBody}>
                  Keep it specific. Mention the object, the place, and the action you are about to take.
                </Text>

                <View style={styles.promptList}>
                  {starterPrompts.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.promptChip}
                      onPress={() => setInput(prompt)}
                    >
                      <Text style={styles.promptChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {messages.map((item) => (
                  <ChatMessageBubble
                    key={item.id}
                    role={item.role}
                    content={item.content}
                    state={item.state}
                  />
                ))}
                {isLoading && (
                  <ChatMessageBubble
                    role="assistant"
                    content="Checking legal posture and consequence..."
                    state="checking"
                  />
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.composerDock}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Scan sign or notice"
              style={styles.cameraButton}
              onPress={pickImage}
              disabled={isLoading}
            >
              <Ionicons name="camera-outline" size={19} color={mobileTheme.colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask TripGuard..."
              placeholderTextColor="#8C7E70"
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stream: {
    flex: 1,
  },
  streamContent: {
    paddingTop: 6,
    paddingBottom: 18,
  },
  emptyState: {
    paddingTop: 30,
    gap: 14,
  },
  emptyBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EEF3FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  emptyBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: mobileTheme.colors.primary,
  },
  emptyBadgeText: {
    color: mobileTheme.colors.primary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  emptyBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
  promptList: {
    gap: 10,
  },
  promptChip: {
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "#F4EEE7",
    borderWidth: 1,
    borderColor: "#E7DCCF",
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: "94%",
  },
  promptChipText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  composerDock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 140,
    borderRadius: 24,
    backgroundColor: "#F4EEE7",
    borderWidth: 1,
    borderColor: "#E7DCCF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#B9B2A7",
  },
});
