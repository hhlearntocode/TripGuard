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
import ScreenSurface from "@/components/ui/ScreenSurface";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import { deriveLegalityState, getLegalityTone, LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  query: string;
  content: string;
  state: LegalityUiState;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uiState, setUiState] = useState<LegalityUiState>("uncertain");

  const quickScenarios = useMemo(
    () => [
      "Can I bring this into Vietnam?",
      "Is this area restricted for foreigners?",
      "What happens if I do this?",
      "Can I ride here with my current license?",
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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !profile) return;

    setUiState("checking");
    setInput("");
    setIsLoading(true);

    const history = messages.flatMap((m) => ([
      { role: "user", content: m.query },
      { role: "assistant", content: m.content },
    ]));

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
      const nextState = deriveLegalityState(data.answer || "");
      const nextMessage: Message = {
        id: Date.now().toString(),
        query: text,
        content: data.answer,
        state: nextState,
      };
      setMessages((prev) => [nextMessage, ...prev]);
      setUiState(nextState);
    } catch (e) {
      setMessages((prev) => [{
        id: `err-${Date.now().toString()}`,
        query: text,
        content: "TripGuard could not verify the scenario right now. Check your connection and retry.",
        state: "warning",
      }, ...prev]);
      setUiState("warning");
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
      await sendMessage(message);
    } catch (e) {
      setIsLoading(false);
      Alert.alert("Error", "Could not identify sign.");
    }
  };

  return (
    <ScreenSurface
      title="Legality Check"
      subtitle={getLegalityTone(uiState)}
      rightNode={<StatusPill state={isLoading ? "checking" : uiState} />}
      scrollable={false}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
          <View style={styles.sectionCard}>
            <SectionHeader
              eyebrow="Scenario input"
              title="State the decision before you make it."
              detail="TripGuard performs best when the action, object, or location is explicit."
            />

            <View style={styles.quickRow}>
              {quickScenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario}
                  style={styles.quickChip}
                  onPress={() => setInput(scenario)}
                >
                  <Text style={styles.quickChipText}>{scenario}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={pickImage} disabled={isLoading}>
                <Ionicons name="camera-outline" size={20} color={mobileTheme.colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Example: Can I carry prescription medicine into Vietnam?"
                placeholderTextColor="#8E7F6E"
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              eyebrow="Assessment log"
              title="Most recent checks"
              detail="TripGuard keeps the latest decision trail visible so the user does not need to reconstruct context."
            />

            {isLoading && (
              <View style={styles.loadingCard}>
                <StatusPill state="checking" />
                <Text style={styles.loadingText}>
                  Checking legal posture and consequence before returning an answer.
                </Text>
              </View>
            )}

            {messages.length === 0 && !isLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No scenario checked yet</Text>
                <Text style={styles.emptySub}>
                  Start with the object, place, or action that feels uncertain.
                </Text>
              </View>
            ) : (
              <View style={styles.resultList}>
                {messages.map((item) => (
                  <View key={item.id} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <StatusPill state={item.state} />
                      <Text style={styles.resultLabel}>Scenario</Text>
                    </View>
                    <Text style={styles.resultQuery}>{item.query}</Text>
                    <Text style={styles.resultAnswer}>{item.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    padding: 18,
    gap: 12,
    marginBottom: 16,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChipText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: mobileTheme.colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: mobileTheme.colors.textPrimary,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    fontFamily: mobileTheme.fonts.body,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: mobileTheme.colors.surfaceStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#A49787",
  },
  loadingCard: {
    backgroundColor: mobileTheme.colors.primarySoft,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  loadingText: {
    color: mobileTheme.colors.primary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyCard: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  resultList: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  resultLabel: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  resultQuery: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  resultAnswer: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
