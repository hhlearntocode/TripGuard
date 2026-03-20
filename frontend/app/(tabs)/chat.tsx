import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import ChatBubble from "@/components/ChatBubble";
import QuickActions from "@/components/QuickActions";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🛡️</Text>
          <View>
            <Text style={styles.headerTitle}>TripGuard</Text>
            <Text style={styles.headerSub}>AI Legal Companion</Text>
          </View>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages */}
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
              "Can I do this here?" — I'll tell you exactly what the law says.
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
            contentContainerStyle={{ paddingVertical: 12 }}
          />
        )}

        <QuickActions
          onSelect={sendMessage}
          visible={messages.length === 0 && !isLoading}
        />

        {/* Input bar */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={pickImage} disabled={isLoading}>
            <Ionicons name="camera-outline" size={22} color="#14B8A6" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a legal question..."
            placeholderTextColor="#9CA3AF"
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
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  headerSub: { fontSize: 12, color: "#6B7280" },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  emptySub: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2937",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#9CA3AF" },
});
