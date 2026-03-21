import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatBubble from "@/components/ChatBubble";
import QuickActions from "@/components/QuickActions";
import GlassPanel from "@/components/GlassPanel";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { UUPM_LIQUID_GLASS as U } from "@/constants/uupmLiquidGlass";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type Props = {
  /** When true, show back control to return to parent (e.g. homepage stack). */
  showBack?: boolean;
};

export default function ConciergeChatScreen({ showBack }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle("light-content");
      return () => StatusBar.setBarStyle("dark-content");
    }, [])
  );

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !profile) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
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
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== "loading"), assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: "err", role: "assistant", content: "Network error — check your connection." },
      ]);
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
    <View style={styles.root}>
      <LinearGradient
        colors={[...U.cinematic.background]}
        locations={[...U.cinematic.locations]}
        style={StyleSheet.absoluteFill}
      />
      {/* Liquid Glass: iridescent wash (UUPM row 14) */}
      <LinearGradient
        colors={[
          "rgba(0, 128, 255, 0.08)",
          "transparent",
          "rgba(32, 178, 170, 0.07)",
          "rgba(139, 0, 255, 0.06)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[U.accent.goldMuted, "transparent", "rgba(45, 212, 191, 0.06)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GlassPanel
          intensity={U.glass.headerBlurIntensity}
          tint="dark"
          style={styles.headerGlass}
        >
          <View style={styles.header}>
            {showBack ? (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Back to home"
              >
                <Ionicons name="chevron-back" size={26} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            <View style={styles.headerCenter}>
              <LinearGradient
                colors={[U.accent.goldMuted, "rgba(45, 212, 191, 0.35)"]}
                style={styles.logoGem}
              >
                <Ionicons name="shield-checkmark" size={22} color="#F8FAFC" />
              </LinearGradient>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>TripGuard</Text>
                <Text style={styles.headerSub}>Concierge for arrival & local law</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineLabel}>Live</Text>
            </View>
          </View>
        </GlassPanel>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyKicker}>Private counsel, on demand</Text>
              <Text style={styles.emptyTitle}>Step off the plane with clarity</Text>
              <Text style={styles.emptySub}>
                Ask what applies at immigration, on the road, and in daily life — plain language
                grounded in local rules, not generic travel blogs.
              </Text>
              <View style={styles.emptyRule} />
              <Text style={styles.emptyHint}>
                Tip: start with your destination and what you plan to do first.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <ChatBubble
                  role={item.role}
                  content={item.content}
                  isLoading={item.id === "loading" && isLoading}
                />
              )}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              contentContainerStyle={styles.listContent}
            />
          )}

          <QuickActions
            onSelect={sendMessage}
            visible={messages.length === 0 && !isLoading}
          />

          <GlassPanel
            intensity={U.glass.composerBlurIntensity}
            tint="dark"
            style={styles.composerGlass}
          >
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={pickImage}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={22} color={U.accent.gold} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask about visas, driving, customs, signs…"
                placeholderTextColor="rgba(248, 250, 252, 0.38)"
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!input.trim() || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    !input.trim() || isLoading
                      ? ["rgba(148, 163, 184, 0.5)", "rgba(100, 116, 139, 0.45)"]
                      : [U.accent.gold, U.accent.teal]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGradient}
                >
                  <Ionicons name="send" size={17} color="#0F172A" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: U.cinematic.background[0] },
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerGlass: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: U.glass.hairline,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  backPlaceholder: { width: 40 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 4,
  },
  headerTitles: { flexShrink: 1 },
  logoGem: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: U.glass.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(248, 250, 252, 0.55)",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  onlineLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(248, 250, 252, 0.5)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  emptyKicker: {
    fontSize: 11,
    fontWeight: "600",
    color: U.accent.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F8FAFC",
    lineHeight: 32,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  emptySub: {
    fontSize: 16,
    color: "rgba(248, 250, 252, 0.62)",
    lineHeight: 24,
  },
  emptyRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: U.glass.borderSubtle,
    marginVertical: 22,
    maxWidth: 56,
  },
  emptyHint: {
    fontSize: 13,
    color: "rgba(248, 250, 252, 0.45)",
    fontStyle: "italic",
    lineHeight: 20,
  },
  listContent: { paddingVertical: 16, paddingBottom: 8 },
  composerGlass: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: U.glass.hairline,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 6 : 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: U.glass.borderSubtle,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#F8FAFC",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: U.glass.borderSubtle,
  },
  sendBtn: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: U.glass.border,
  },
  sendBtnDisabled: {
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  sendGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
