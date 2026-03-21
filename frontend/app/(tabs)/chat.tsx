import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatBubble from "@/components/ChatBubble";
import QuickActions from "@/components/QuickActions";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { COLORS } from "@/constants/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface ToolCall {
  tool: string;
  args: Record<string, any>;
}

interface SignInfo {
  code: string;
  name: string;
  meaning: string;
  category?: string;
}

interface PendingImage {
  uri: string;
  base64: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  toolsUsed?: ToolCall[];
  steps?: string[];
  signInfo?: SignInfo;
  imageUri?: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  const sendMessage = async (text: string) => {
    const hasText = !!text.trim();
    const hasImage = !!pendingImage;
    if (!hasText && !hasImage) return;
    if (isLoading || !profile) return;

    // Capture and clear pending image immediately so UI resets
    const capturedImage = pendingImage;
    setPendingImage(null);
    setInput("");
    setIsLoading(true);

    let signInfo: SignInfo | undefined;
    let imageUri: string | undefined;
    let apiMessage = text.trim();

    // Step 1: identify sign via vision API if image was attached
    if (capturedImage) {
      imageUri = capturedImage.uri;
      try {
        const visionResp = await fetch(`${API_URL}/api/vision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_b64: capturedImage.base64 }),
        });
        const sign = await visionResp.json();

        if (sign.code) {
          signInfo = {
            code: sign.code,
            name: sign.name,
            meaning: sign.meaning,
            category: sign.category,
          };
          const signContext = `[Traffic sign in photo: ${sign.code} — "${sign.name}" — ${sign.meaning}]`;
          apiMessage = hasText
            ? `${signContext}\n\nUser question: ${text.trim()}`
            : `${signContext}\n\nExplain what this traffic sign means, where it is typically placed, what the legal violation is, and the exact fine. Search the web for details about this specific sign (${sign.code}) under QCVN 41:2024.`;
        } else {
          const signContext = "[User uploaded a Vietnamese traffic sign photo — auto-identification was unsuccessful]";
          apiMessage = hasText
            ? `${signContext}\n\nUser question: ${text.trim()}`
            : `${signContext}\n\nSearch the web to help identify this Vietnamese traffic sign and explain its legal implications.`;
        }
      } catch {
        // Vision failed silently — continue with text only
      }
    }

    // Add user bubble immediately (shows photo + sign card + typed question)
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      signInfo,
      imageUri,
    };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "" };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    // Step 2: send to chat API
    try {
      const resp = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: apiMessage || "What does this traffic sign mean?",
          user_profile: profile,
          conversation_history: history,
        }),
      });
      const data = await resp.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          sources: data.sources ?? [],
          toolsUsed: data.debug?.tools_used ?? [],
          steps: data.debug?.steps ?? [],
        },
      ]);
    } catch {
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
    // Just attach — don't send yet
    setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;
  const canSend = (!!input.trim() || !!pendingImage) && !isLoading;

  return (
    <LinearGradient colors={[COLORS.bg, "#0F1E35", COLORS.bg2]} style={styles.root}>
      {/* Header */}
      <BlurView intensity={50} tint="dark" style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldEmoji}>🛡️</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>TripGuard</Text>
            <Text style={styles.headerSub}>AI Legal Companion</Text>
          </View>
        </View>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Live</Text>
        </View>
      </BlurView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⚖️</Text>
            <Text style={styles.emptyTitle}>Ask me anything legal</Text>
            <Text style={styles.emptySub}>
              "Can I do this here?" — I'll check Vietnamese law for you.
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
                sources={item.sources}
                toolsUsed={item.toolsUsed}
                signInfo={item.signInfo}
                imageUri={item.imageUri}
              />
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 14 }}
          />
        )}

        <QuickActions onSelect={sendMessage} visible={messages.length === 0 && !isLoading} />

        {/* Input bar */}
        <BlurView intensity={60} tint="dark" style={[styles.inputWrap, { paddingBottom: TAB_BAR_HEIGHT + 8 }]}>

          {/* Pending image attachment preview */}
          {pendingImage && (
            <View style={styles.pendingImageRow}>
              <View style={styles.pendingThumbWrap}>
                <Image
                  source={{ uri: pendingImage.uri }}
                  style={styles.pendingThumb}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeThumbBtn}
                  onPress={() => setPendingImage(null)}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.pendingLabel}>📷 Sign attached — add your question below</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.iconBtn, !!pendingImage && styles.iconBtnActive]}
              onPress={pickImage}
              disabled={isLoading}
            >
              <Ionicons
                name={pendingImage ? "camera" : "camera-outline"}
                size={20}
                color={COLORS.teal}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={pendingImage ? "Ask about this sign..." : "Ask a legal question..."}
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!canSend}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    backgroundColor: "rgba(10, 22, 40, 0.6)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  shieldBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.tealGlass,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  shieldEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textSecondary },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.okGlass,
    borderWidth: 1,
    borderColor: COLORS.okBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.ok },
  onlineText: { fontSize: 11, color: COLORS.ok, fontWeight: "600" },

  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 18 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 10 },
  emptySub: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },

  inputWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    backgroundColor: "rgba(10, 22, 40, 0.65)",
    paddingTop: 10,
    paddingHorizontal: 14,
  },

  // Pending image attachment
  pendingImageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  pendingThumbWrap: {
    position: "relative",
  },
  pendingThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.tealBorder,
  },
  removeThumbBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "500",
    lineHeight: 17,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tealGlass,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: {
    backgroundColor: COLORS.teal + "40",
    borderColor: COLORS.teal,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder },
});
