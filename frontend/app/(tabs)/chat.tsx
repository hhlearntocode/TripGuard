import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInputKeyPressEventData,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { useLocalSearchParams } from "expo-router";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { useVoiceChatRecorder } from "@/hooks/useVoiceChatRecorder";
import {
  appendMessageToThread,
  ChatThreadMessage,
  createChatThread,
  dismissAssessmentForThread,
  loadChatThread,
  loadDismissedAssessmentIds,
  loadChatThreadSummaries,
  updateChatThreadTitle,
} from "@/hooks/useChatHistory";
import ScreenSurface from "@/components/ui/ScreenSurface";
import AppDashboardMenu from "@/components/ui/AppDashboardMenu";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import { deriveLegalityState, getLegalityTone, LegalityUiState } from "@/features/flows";
import { mobileTheme } from "@/theme/mobileTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const WEB_ASSESSMENT_BOTTOM_FADE_MASK = {
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
  maskImage: "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
} as const;
const WEB_EDGE_FADE_MASK = {
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 100%)",
  maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 100%)",
} as const;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  state?: LegalityUiState;
  created_at: string;
  attachments?: Array<{ uri: string }>;
  sources?: string[];
}

interface PendingAttachment {
  id: string;
  uri: string;
  base64?: string;
}

type MessageOrigin = "typed" | "voice";

function AnswerText({ text, sources }: { text: string; sources?: string[] }) {
  const urlSources = (sources ?? []).filter((s) => s.startsWith("http"));
  return (
    <View style={{ gap: 0 }}>
      <Markdown
        style={markdownStyles}
        onLinkPress={(url) => {
          void Linking.openURL(url);
          return false;
        }}
      >
        {text}
      </Markdown>

      {urlSources.length > 0 && (
        <View style={answerStyles.refsBlock}>
          <Text style={answerStyles.refsLabel}>References</Text>
          {urlSources.map((url, i) => {
            const domain = url.replace(/^https?:\/\//, "").split("/")[0];
            const path = url.replace(/^https?:\/\/[^/]+/, "").slice(0, 48) || "/";
            return (
              <TouchableOpacity
                key={i}
                style={answerStyles.refRow}
                onPress={() => Linking.openURL(url)}
              >
                <Ionicons name="link-outline" size={12} color={mobileTheme.colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={answerStyles.refDomain}>{domain}</Text>
                  <Text style={answerStyles.refPath} numberOfLines={1}>{path}</Text>
                </View>
                <Ionicons name="open-outline" size={12} color={mobileTheme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function AssessmentText({ text }: { text: string }) {
  return (
    <Markdown
      style={assessmentMarkdownStyles}
      onLinkPress={(url) => {
        void Linking.openURL(url);
        return false;
      }}
    >
      {text}
    </Markdown>
  );
}

const answerStyles = StyleSheet.create({
  refsBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(99,102,241,0.15)",
    gap: 6,
  },
  refsLabel: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    color: mobileTheme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 3,
  },
  refDomain: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "600",
    color: mobileTheme.colors.primary,
  },
  refPath: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    color: mobileTheme.colors.textSecondary,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  text: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  heading1: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 22,
    lineHeight: 28,
    marginTop: 4,
    marginBottom: 10,
  },
  heading2: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 4,
    marginBottom: 8,
  },
  heading3: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 8,
  },
  strong: {
    color: mobileTheme.colors.textPrimary,
    fontWeight: "700",
  },
  em: {
    color: mobileTheme.colors.textSecondary,
    fontStyle: "italic",
  },
  bullet_list: {
    marginTop: 2,
    marginBottom: 10,
  },
  ordered_list: {
    marginTop: 2,
    marginBottom: 10,
  },
  list_item: {
    marginBottom: 6,
  },
  bullet_list_icon: {
    color: mobileTheme.colors.primary,
    marginRight: 6,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_icon: {
    color: mobileTheme.colors.primary,
    marginRight: 6,
  },
  ordered_list_content: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: mobileTheme.colors.line,
    paddingLeft: 10,
    marginVertical: 8,
    opacity: 0.92,
  },
  code_inline: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    color: mobileTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 13,
  },
  code_block: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    color: mobileTheme.colors.textOnDark,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  fence: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    color: mobileTheme.colors.textOnDark,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  hr: {
    backgroundColor: mobileTheme.colors.line,
    height: 1,
    marginVertical: 12,
  },
  link: {
    color: mobileTheme.colors.primary,
    textDecorationLine: "underline",
  },
});

const assessmentMarkdownStyles = StyleSheet.create({
  body: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  text: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  heading1: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 2,
    marginBottom: 8,
  },
  heading2: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 2,
    marginBottom: 8,
  },
  heading3: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
    marginBottom: 6,
  },
  strong: {
    color: mobileTheme.colors.textPrimary,
    fontWeight: "700",
  },
  em: {
    color: mobileTheme.colors.textSecondary,
    fontStyle: "italic",
  },
  bullet_list: {
    marginTop: 2,
    marginBottom: 8,
  },
  ordered_list: {
    marginTop: 2,
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list_icon: {
    color: mobileTheme.colors.primary,
    marginRight: 6,
  },
  ordered_list_icon: {
    color: mobileTheme.colors.primary,
    marginRight: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: mobileTheme.colors.line,
    paddingLeft: 10,
    marginVertical: 6,
  },
  code_inline: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    color: mobileTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 13,
  },
  code_block: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    color: mobileTheme.colors.textOnDark,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  fence: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    color: mobileTheme.colors.textOnDark,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  link: {
    color: mobileTheme.colors.primary,
    textDecorationLine: "underline",
  },
});

async function readErrorDetail(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
  } catch {
    // Ignore parse failures and use the fallback.
  }
  return fallback;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ query?: string; chat_id?: string }>();
  const { width } = useWindowDimensions();
  const isWideLayout = Platform.OS === "web" && width >= 1080;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uiState, setUiState] = useState<LegalityUiState>("uncertain");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [threadReady, setThreadReady] = useState(false);
  const [dismissedAssessmentIds, setDismissedAssessmentIds] = useState<string[]>([]);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
  const [isAssessmentCollapsed, setIsAssessmentCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [composerHeight, setComposerHeight] = useState(188);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [isProcessingVoiceInput, setIsProcessingVoiceInput] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isQuickTrayOpen, setIsQuickTrayOpen] = useState(false);
  const conversationScrollRef = useRef<ScrollView | null>(null);
  const draftBeforeRecordingRef = useRef("");

  const quickScenarios = useMemo(
    () => [
      "I bought a vape in Thailand—can I bring it into Vietnam through the airport?",
      
      "I'm near a military-looking area in Hanoi with warning signs—am I allowed to enter or take photos here as a foreigner?",
      
      "What happens if I accidentally overstay my visa in Vietnam by a few days?",
      
      "I have an international driving permit—can I legally ride a motorbike in Ho Chi Minh City?",
      
      "Can I fly a drone at this beach in Da Nang, or do I need permission first?",
      
      "Is it okay to take photos of police or government buildings in Vietnam?",
      
      "I was invited to drink at a local bar—what are the laws around alcohol limits if I plan to ride back?",
      
      "Can I carry prescription medication like sleeping pills into Vietnam without issues?",
    ],
    []
  );
  
  const fetchScribeToken = async () => {
    const response = await fetch(`${API_URL}/api/voice/scribe-token`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(await readErrorDetail(response, "Could not start voice capture."));
    }

    const data = await response.json();
    if (!data?.token || typeof data.token !== "string") {
      throw new Error("Voice token response was empty.");
    }
    return data.token;
  };

  const {
    isSupported: isVoiceSupported,
    isRecording,
    isConnecting: isConnectingVoice,
    liveTranscript,
    voiceError: recorderVoiceError,
    startRecording,
    stopRecording,
    clearVoiceError,
    clearTranscript,
  } = useVoiceChatRecorder(fetchScribeToken);

  useEffect(() => {
    loadUserProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (recorderVoiceError) {
      setVoiceError(recorderVoiceError);
    }
  }, [recorderVoiceError]);

  useEffect(() => {
    if (Platform.OS === "web" && !isVoiceSupported) {
      setVoiceError("Microphone input is not supported in this browser.");
    }
  }, [isVoiceSupported]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  };

  const scrollConversationToBottom = () => {
    requestAnimationFrame(() => {
      conversationScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const hydrateThread = async (chatId: string) => {
    const thread = await loadChatThread(chatId);
    if (!thread) return false;
    const nextMessages: Message[] = thread.messages.map((msg: ChatThreadMessage) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      state: msg.state as LegalityUiState | undefined,
      created_at: msg.created_at,
    }));
    setActiveChatId(chatId);
    setMessages(nextMessages);
    const dismissed = await loadDismissedAssessmentIds(chatId);
    setDismissedAssessmentIds(dismissed);
    const lastAssistant = [...nextMessages].reverse().find((m) => m.role === "assistant");
    setUiState(lastAssistant?.state || (lastAssistant ? deriveLegalityState(lastAssistant.content) : "uncertain"));
    return true;
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      setThreadReady(false);
      const paramChatId = params.chat_id && !Array.isArray(params.chat_id) ? params.chat_id : null;
      if (paramChatId) {
        const ok = await hydrateThread(paramChatId);
        if (ok && mounted) {
          setThreadReady(true);
          return;
        }
      }

      const summaries = await loadChatThreadSummaries();
      if (summaries.length > 0) {
        const ok = await hydrateThread(summaries[0].chat_id);
        if (ok && mounted) {
          setThreadReady(true);
          return;
        }
      }

      const created = await createChatThread();
      if (!mounted) return;
      setActiveChatId(created.chat_id);
      setMessages([]);
      setUiState("uncertain");
      setThreadReady(true);
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [params.chat_id]);

  useEffect(() => {
    if (!params.query || Array.isArray(params.query)) return;
    setInput(params.query);
  }, [params.query]);

  useEffect(() => {
    if (!threadReady) return;
    scrollConversationToBottom();
  }, [messages.length, activeChatId, threadReady]);

  const assessmentItems = useMemo(() => {
    const logs: Array<{ id: string; query: string; content: string; state: LegalityUiState; created_at: string }> = [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const current = messages[i];
      if (current.role !== "assistant") continue;
      let query = "Scenario";
      for (let j = i - 1; j >= 0; j -= 1) {
        if (messages[j].role === "user") {
          query = messages[j].content;
          break;
        }
      }
      logs.push({
        id: current.id,
        query,
        content: current.content,
        state: current.state || deriveLegalityState(current.content),
        created_at: current.created_at,
      });
    }
    return logs.filter((item) => !dismissedAssessmentIds.includes(item.id));
  }, [messages, dismissedAssessmentIds]);

  const sendMessage = async (text: string, options: { origin?: MessageOrigin } = {}) => {
    if ((!text.trim() && attachments.length === 0) || isLoading || !profile || !threadReady) return;
    if (Platform.OS === "web") {
      setIsQuickTrayOpen(false);
    }

    let threadId = activeChatId;
    if (!threadId) {
      const created = await createChatThread();
      threadId = created.chat_id;
      setActiveChatId(threadId);
    }

    const typedQuery = text.trim();
    const isVoiceTurn = options.origin === "voice";
    setUiState("checking");
    setInput("");
    setIsLoading(true);
    if (isVoiceTurn) {
      setVoiceError(null);
    }

    const sentAttachments = [...attachments];
    let query = typedQuery || "I attached image(s). Please analyze what this means legally in Vietnam.";
    if (attachments.length > 0) {
      const lines = await Promise.all(
        attachments.map(async (a, i) => {
          if (!a.base64) return `- Image ${i + 1}: attached (analysis unavailable).`;
          try {
            const visionResp = await fetch(`${API_URL}/api/vision/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_b64: a.base64 }),
            });
            const result = await visionResp.json();

            if (result?.type === "sign" && result.code) {
              return `[Traffic sign in photo: ${result.code} — "${result.name}" — category:${result.category ?? "unknown"}]`;
            }

            if (result?.type === "object" && result.description) {
              return `[Image content: ${result.description}${result.law_relevance ? ` — domain:${result.law_relevance}` : ""}]`;
            }

            return `- Image ${i + 1}: could not identify content.`;
          } catch {
            return `- Image ${i + 1}: could not analyze image.`;
          }
        })
      );
      query = `${query}\n\nAttached images:\n${lines.join("\n")}`;
    }
    setAttachments([]);

    // Build history from prior turns ONLY — before appending the new user message.
    // Sending convo (which includes the new message) would cause the current turn
    // to appear twice in the LLM context (once in history, once as `message`).
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMessage: Message = {
      id: `u-${Date.now().toString()}`,
      role: "user",
      content: typedQuery || "[Image attachment]",
      created_at: new Date().toISOString(),
      attachments: sentAttachments.map((a) => ({ uri: a.uri })),
    };
    const convo = [...messages, userMessage];
    setMessages(convo);
    await appendMessageToThread(threadId, { role: "user", content: query });

    const userCount = convo.filter((m) => m.role === "user").length;
    if (userCount === 1) {
      await updateChatThreadTitle(threadId, query);
    }

    const TOOL_LABELS: Record<string, string> = {
      retrieve_law: "Retrieving ...",
      web_search: "Searching ...",
      scrape_url: "Gathering information ...",
    };

    try {
      const resp = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          user_profile: profile,
          conversation_history: history,
        }),
      });

      // Streaming path (web + modern native)
      if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        let sources: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let event: Record<string, unknown>;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }

            if (event.type === "tool_start") {
              setLoadingStatus(TOOL_LABELS[event.tool as string] ?? null);
            } else if (event.type === "done") {
              answer = (event.answer as string) || "";
              sources = (event.sources as string[]) || [];
            }
          }
        }

        const nextState = deriveLegalityState(answer);
        const nextMessage: Message = {
          id: `a-${Date.now().toString()}`,
          role: "assistant",
          content: answer,
          state: nextState,
          created_at: new Date().toISOString(),
          sources,
        };
        setMessages((prev) => [...prev, nextMessage]);
        await appendMessageToThread(threadId, { role: "assistant", content: answer, state: nextState });
        setUiState(nextState);
      } else {
        // Fallback: non-streaming (native builds that don't support body reader)
        const data = await resp.json();
        const nextState = deriveLegalityState(data.answer || "");
        const nextMessage: Message = {
          id: `a-${Date.now().toString()}`,
          role: "assistant",
          content: data.answer,
          state: nextState,
          created_at: new Date().toISOString(),
          sources: data.sources || [],
        };
        setMessages((prev) => [...prev, nextMessage]);
        await appendMessageToThread(threadId, { role: "assistant", content: data.answer || "", state: nextState });
        setUiState(nextState);
      }
    } catch (e) {
      const fallback = "TripGuard could not verify the scenario right now. Check your connection and retry.";
      const errorMessage: Message = {
        id: `err-${Date.now().toString()}`,
        role: "assistant",
        content: fallback,
        state: "warning",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      await appendMessageToThread(threadId, { role: "assistant", content: fallback, state: "warning" });
      setUiState("warning");
    } finally {
      setLoadingStatus(null);
      setIsLoading(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!activeChatId || deletingAssessmentId) return;
    setDeletingAssessmentId(assessmentId);
    await dismissAssessmentForThread(activeChatId, assessmentId);
    setDismissedAssessmentIds((prev) => [assessmentId, ...prev]);
    setDeletingAssessmentId(null);
  };

  const handleComposerKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (nativeEvent.key !== "Enter") return;
    if (nativeEvent.shiftKey) return;
    if (Platform.OS !== "web") return;

    (event as unknown as { preventDefault?: () => void }).preventDefault?.();
    if ((input.trim() || attachments.length > 0) && !isLoading && !isRecording && !isProcessingVoiceInput) {
      void sendMessage(input);
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

    const picked = result.assets[0];
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: picked.uri,
        base64: picked.base64 || undefined,
      },
    ]);
  };

  const handleVoiceToggle = async () => {
    if (!isVoiceSupported || isLoading || !profile || !threadReady) return;

    if (isRecording) {
      setIsProcessingVoiceInput(true);
      try {
        const transcript = (await stopRecording()).trim();
        clearVoiceError();
        if (!transcript) {
          setInput(draftBeforeRecordingRef.current);
          setVoiceError("No speech was captured. Try speaking a bit closer to the mic.");
          return;
        }
        setInput(transcript);
        await sendMessage(transcript, { origin: "voice" });
      } finally {
        setIsProcessingVoiceInput(false);
      }
      return;
    }

    draftBeforeRecordingRef.current = input;
    setVoiceError(null);
    clearVoiceError();
    clearTranscript();
    await startRecording();
  };

  const composerInputValue = isRecording || isProcessingVoiceInput ? liveTranscript : input;
  const isSendDisabled =
    (!input.trim() && attachments.length === 0) || isLoading || isRecording || isProcessingVoiceInput;
  const isMicDisabled =
    !isVoiceSupported || isLoading || !profile || !threadReady || isConnectingVoice;
  const isQuickTrayExpanded = Platform.OS !== "web" || isQuickTrayOpen;
  const voiceStatusText = isConnectingVoice
    ? "Starting microphone..."
    : isRecording
      ? "Listening in English..."
      : isProcessingVoiceInput
        ? "Finalizing transcript..."
        : null;

  return (
    <ScreenSurface
      title="Legality Check"
      subtitle={voiceStatusText || getLegalityTone(uiState)}
      leftNode={<AppDashboardMenu />}
      rightNode={<StatusPill state={isLoading ? "checking" : uiState} />}
      scrollable={false}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatRoot}>
          {isWideLayout ? (
            <View style={[styles.wideLayout, { paddingBottom: composerHeight + 12 }]}>
              <View style={[styles.leftPane, isAssessmentCollapsed && styles.leftPaneExpanded]}>
                <View style={styles.topActionsRow}>
                  <TouchableOpacity
                    style={styles.assessmentToggleBtn}
                    onPress={() => setIsAssessmentCollapsed((prev) => !prev)}
                  >
                    <Ionicons
                      name={isAssessmentCollapsed ? "chevron-back" : "chevron-forward"}
                      size={14}
                      color={mobileTheme.colors.textSecondary}
                    />
                    <Text style={styles.assessmentToggleText}>
                      {isAssessmentCollapsed ? "Show assessment" : "Hide assessment"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.sectionCard, styles.conversationCardWide]}>
                  <ScrollView
                    ref={conversationScrollRef}
                    showsVerticalScrollIndicator={false}
                    style={[
                      styles.conversationScroll,
                      Platform.OS === "web" ? WEB_EDGE_FADE_MASK : null,
                    ]}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    onContentSizeChange={scrollConversationToBottom}
                  >
                    {messages.length === 0 && !isLoading ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No messages in this thread yet</Text>
                        <Text style={styles.emptySub}>Start with a clear question to begin this conversation.</Text>
                      </View>
                    ) : (
                      <View style={styles.resultList}>
                        {messages.map((item) => (
                          <View
                            key={item.id}
                            style={[
                              styles.chatBubble,
                              item.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                            ]}
                          >
                            {item.role === "assistant" && <Text style={styles.chatBubbleRole}>TripGuard</Text>}
                            {item.role === "user" && !!item.attachments?.length && (
                              <View style={styles.sentAttachmentRow}>
                                {item.attachments.map((attachment, idx) => (
                                  <Image
                                    key={`${item.id}-att-${idx.toString()}`}
                                    source={{ uri: attachment.uri }}
                                    style={styles.sentAttachmentThumb}
                                  />
                                ))}
                              </View>
                            )}
                            {item.role === "assistant" ? (
                              <AnswerText text={item.content} sources={item.sources} />
                            ) : (
                              <Text style={styles.chatBubbleText}>{item.content}</Text>
                            )}
                          </View>
                        ))}
                        {isLoading && (
                          <View style={[styles.chatBubble, styles.chatBubbleAssistant, styles.statusBubble]}>
                            <Text style={styles.chatBubbleRole}>TripGuard</Text>
                            <Text style={styles.statusBubbleText}>{loadingStatus ?? "Thinking ..."}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>

              {!isAssessmentCollapsed && (
                <View style={styles.rightPane}>
                  <View style={[styles.sectionCard, styles.logCard]}>
                  <SectionHeader
                    eyebrow="Assessment log"
                    title="Most recent checks"
                    detail="This panel tracks analyzed scenarios for the active chat only."
                  />

                  {isLoading && (
                    <View style={styles.loadingCard}>
                      <StatusPill state="checking" />
                      <Text style={styles.loadingText}>
                        {loadingStatus ?? "Checking legal posture and consequence before returning an answer."}
                      </Text>
                    </View>
                  )}

                  <View style={styles.assessmentScrollWrap}>
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      style={[
                        styles.assessmentScroll,
                        Platform.OS === "web" ? WEB_ASSESSMENT_BOTTOM_FADE_MASK : null,
                      ]}
                    >
                      {assessmentItems.length === 0 && !isLoading ? (
                        <View style={styles.emptyCard}>
                          <Text style={styles.emptyTitle}>No scenario checked yet</Text>
                          <Text style={styles.emptySub}>
                            Start with the object, place, or action that feels uncertain.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.resultList}>
                          {assessmentItems.map((item) => (
                            <View key={item.id} style={styles.resultCard}>
                              <View style={styles.resultHeader}>
                                <View style={styles.resultHeaderLeft}>
                                  <StatusPill state={item.state} />
                                  <Text style={styles.resultLabel}>Scenario</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.resultDeleteBtn}
                                  onPress={() => void handleDeleteAssessment(item.id)}
                                  disabled={deletingAssessmentId === item.id}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={14}
                                    color={mobileTheme.colors.textSecondary}
                                  />
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.resultQuery}>{item.query}</Text>
                              <View style={styles.resultAnswerWrap}>
                                <AssessmentText text={item.content} />
                              </View>
                              <Text style={styles.resultTime}>{formatDateTime(item.created_at)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </ScrollView>
                    {Platform.OS !== "web" && <View pointerEvents="none" style={styles.assessmentFadeFallback} />}
                  </View>
                </View>
                </View>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.screenContent, { paddingBottom: composerHeight + 12 }]}>
              <View style={[styles.sectionCard, styles.conversationCardNarrow]}>
                <ScrollView
                  ref={conversationScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={[
                    styles.conversationScrollNarrow,
                    Platform.OS === "web" ? WEB_EDGE_FADE_MASK : null,
                  ]}
                  onContentSizeChange={scrollConversationToBottom}
                >
                  {messages.length === 0 && !isLoading ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No messages in this thread yet</Text>
                      <Text style={styles.emptySub}>Start with a clear question to begin this conversation.</Text>
                    </View>
                  ) : (
                    <View style={styles.resultList}>
                      {messages.map((item) => (
                        <View
                          key={item.id}
                          style={[
                            styles.chatBubble,
                            item.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                          ]}
                        >
                          {item.role === "assistant" && <Text style={styles.chatBubbleRole}>TripGuard</Text>}
                          {item.role === "user" && !!item.attachments?.length && (
                            <View style={styles.sentAttachmentRow}>
                              {item.attachments.map((attachment, idx) => (
                                <Image
                                  key={`${item.id}-att-${idx.toString()}`}
                                  source={{ uri: attachment.uri }}
                                  style={styles.sentAttachmentThumb}
                                />
                              ))}
                            </View>
                          )}
                          {item.role === "assistant" ? (
                            <AnswerText text={item.content} sources={item.sources} />
                          ) : (
                            <Text style={styles.chatBubbleText}>{item.content}</Text>
                          )}
                        </View>
                      ))}
                      {isLoading && (
                        <View style={[styles.chatBubble, styles.chatBubbleAssistant, styles.statusBubble]}>
                          <Text style={styles.chatBubbleRole}>TripGuard</Text>
                          <Text style={styles.statusBubbleText}>{loadingStatus ?? "Thinking ..."}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
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

                <View style={styles.assessmentScrollWrap}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={[
                      styles.assessmentScroll,
                      Platform.OS === "web" ? WEB_ASSESSMENT_BOTTOM_FADE_MASK : null,
                    ]}
                  >
                    {assessmentItems.length === 0 && !isLoading ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No scenario checked yet</Text>
                        <Text style={styles.emptySub}>
                          Start with the object, place, or action that feels uncertain.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.resultList}>
                        {assessmentItems.map((item) => (
                          <View key={item.id} style={styles.resultCard}>
                            <View style={styles.resultHeader}>
                              <View style={styles.resultHeaderLeft}>
                                <StatusPill state={item.state} />
                                <Text style={styles.resultLabel}>Scenario</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.resultDeleteBtn}
                                onPress={() => void handleDeleteAssessment(item.id)}
                                disabled={deletingAssessmentId === item.id}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={14}
                                  color={mobileTheme.colors.textSecondary}
                                />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.resultQuery}>{item.query}</Text>
                            <View style={styles.resultAnswerWrap}>
                              <AssessmentText text={item.content} />
                            </View>
                            <Text style={styles.resultTime}>{formatDateTime(item.created_at)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                  {Platform.OS !== "web" && <View pointerEvents="none" style={styles.assessmentFadeFallback} />}
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.composerDock}>
            <View
              style={styles.composerCard}
              onLayout={(event) => {
                const h = Math.ceil(event.nativeEvent.layout.height);
                if (h !== composerHeight) setComposerHeight(h);
              }}
            >
              {attachments.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attachmentRow}
                >
                  {attachments.map((attachment) => (
                    <View key={attachment.id} style={styles.attachmentThumbWrap}>
                      <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} />
                      <TouchableOpacity
                        style={styles.attachmentRemoveBtn}
                        onPress={() => setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))}
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {Platform.OS === "web" ? (
                <View style={styles.quickTrayArea}>
                  <TouchableOpacity
                    style={styles.quickTrayTrigger}
                    onPress={() => setIsQuickTrayOpen((prev) => !prev)}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={isQuickTrayExpanded ? "Hide quick prompts" : "Show quick prompts"}
                  >
                    <BlurView intensity={22} tint="light" style={styles.quickTrayTriggerBlur}>
                      <View style={styles.quickTrayTriggerCopy}>
                        <Text style={styles.quickTrayLabel}>Quick prompts</Text>
                        <Text style={styles.quickTrayHint}>
                          {isQuickTrayExpanded ? "Tap to hide" : "Tap to open"}
                        </Text>
                      </View>
                      <Ionicons
                        name={isQuickTrayExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={mobileTheme.colors.textSecondary}
                      />
                    </BlurView>
                  </TouchableOpacity>

                  {isQuickTrayExpanded && (
                    <View style={styles.quickTrayPopup}>
                      <BlurView intensity={34} tint="light" style={styles.quickTrayPopupBlur}>
                        <View style={styles.quickRow}>
                          {quickScenarios.map((scenario) => (
                            <TouchableOpacity
                              key={scenario}
                              style={styles.quickChip}
                              onPress={() => {
                                setInput(scenario);
                                setIsQuickTrayOpen(false);
                              }}
                            >
                              <Text style={styles.quickChipText}>{scenario}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </BlurView>
                    </View>
                  )}
                </View>
              ) : (
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
              )}

              {(voiceStatusText || voiceError || (isRecording && liveTranscript)) && (
                <View style={[styles.voiceCard, voiceError ? styles.voiceCardError : null]}>
                  <View style={styles.voiceCardHeader}>
                    <Text style={styles.voiceCardTitle}>{voiceError ? "Voice unavailable" : "Voice chat"}</Text>
                    {!!voiceStatusText && <Text style={styles.voiceCardMeta}>{voiceStatusText}</Text>}
                  </View>
                  {!!voiceError && <Text style={styles.voiceCardErrorText}>{voiceError}</Text>}
                  {!voiceError && !!liveTranscript && (
                    <Text style={styles.voiceTranscriptText}>{liveTranscript}</Text>
                  )}
                </View>
              )}

              <View style={styles.inputRow}>
                <TouchableOpacity
                  style={[styles.iconBtn, (isLoading || isRecording) && styles.iconBtnDisabled]}
                  onPress={pickImage}
                  disabled={isLoading || isRecording}
                >
                  <Ionicons name="camera-outline" size={20} color={mobileTheme.colors.primary} />
                </TouchableOpacity>
                {Platform.OS === "web" && (
                  <TouchableOpacity
                    style={[
                      styles.iconBtn,
                      isRecording && styles.iconBtnActive,
                      isMicDisabled && styles.iconBtnDisabled,
                    ]}
                    onPress={() => void handleVoiceToggle()}
                    disabled={isMicDisabled}
                    accessibilityLabel={isRecording ? "Stop voice recording" : "Start voice recording"}
                  >
                    <Ionicons
                      name={isRecording ? "stop" : "mic-outline"}
                      size={20}
                      color={isRecording ? "#fff" : mobileTheme.colors.primary}
                    />
                  </TouchableOpacity>
                )}
                <TextInput
                  style={styles.input}
                  value={composerInputValue}
                  onChangeText={setInput}
                  onFocus={() => {
                    if (Platform.OS === "web") {
                      setIsQuickTrayOpen(false);
                    }
                  }}
                  placeholder={
                    isRecording
                      ? "Listening in English..."
                      : "Example: Can I carry prescription medicine into Vietnam?"
                  }
                  placeholderTextColor="#8E7F6E"
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onKeyPress={handleComposerKeyPress}
                  editable={!isRecording && !isProcessingVoiceInput}
                  onSubmitEditing={() => sendMessage(input)}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    isSendDisabled && styles.sendBtnDisabled,
                  ]}
                  onPress={() => sendMessage(input)}
                  disabled={isSendDisabled}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  chatRoot: {
    flex: 1,
  },
  wideLayout: {
    flex: 1,
    flexDirection: "row",
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  leftPane: {
    flex: 1.6,
  },
  leftPaneExpanded: {
    flex: 1,
  },
  rightPane: {
    flex: 1,
    paddingTop: 2,
  },
  logCard: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
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
  topActionsRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  assessmentToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assessmentToggleText: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  conversationCardWide: {
    flex: 1,
  },
  conversationCardNarrow: {
    minHeight: 320,
  },
  conversationScroll: {
    flex: 1,
  },
  conversationScrollNarrow: {
    maxHeight: 360,
  },
  assessmentScrollWrap: {
    position: "relative",
    flex: 1,
  },
  assessmentScroll: {
    flex: 1,
  },
  assessmentFadeFallback: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    backgroundColor: "rgba(246, 241, 232, 0.55)",
  },
  composerDock: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 12,
  },
  composerCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    padding: 14,
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  attachmentRow: {
    gap: 8,
    paddingBottom: 2,
  },
  attachmentThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    overflow: "hidden",
    backgroundColor: mobileTheme.colors.surfaceAlt,
    position: "relative",
  },
  attachmentThumb: {
    width: "100%",
    height: "100%",
  },
  attachmentRemoveBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(16, 36, 59, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickTrayArea: {
    position: "relative",
    zIndex: 20,
    marginBottom: 2,
  },
  quickTrayTrigger: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(16,36,59,0.08)",
  },
  quickTrayTriggerBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  quickTrayTriggerCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickTrayLabel: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  quickTrayHint: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
  },
  quickTrayPopup: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 34,
    zIndex: 30,
  },
  quickTrayPopupBlur: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(16,36,59,0.08)",
    backgroundColor: "rgba(255,255,255,0.76)",
    padding: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
  voiceCard: {
    backgroundColor: mobileTheme.colors.primarySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  voiceCardError: {
    backgroundColor: "#FDECEC",
    borderColor: "rgba(190,24,24,0.18)",
  },
  voiceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  voiceCardTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  voiceCardMeta: {
    color: mobileTheme.colors.primary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "600",
  },
  voiceCardErrorText: {
    color: "#991B1B",
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  voiceTranscriptText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
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
  iconBtnActive: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
  },
  iconBtnDisabled: {
    opacity: 0.52,
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
  resultHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  resultDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface,
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
  resultAnswerWrap: {
    minWidth: 0,
  },
  resultTime: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "600",
    alignSelf: "flex-end",
    marginTop: 2,
    opacity: 0.82,
  },
  chatBubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 4,
    maxWidth: "86%",
  },
  chatBubbleUser: {
    backgroundColor: mobileTheme.colors.primarySoft,
    borderColor: "rgba(30,58,138,0.2)",
    alignSelf: "flex-end",
    maxWidth: "54%",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chatBubbleAssistant: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderColor: mobileTheme.colors.line,
    alignSelf: "flex-start",
  },
  chatBubbleRole: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chatBubbleText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  statusBubble: {
    opacity: 0.72,
  },
  statusBubbleText: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    color: mobileTheme.colors.textSecondary,
    fontStyle: "italic",
  },
  sentAttachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  sentAttachmentThumb: {
    width: 62,
    height: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    backgroundColor: mobileTheme.colors.surfaceAlt,
  },
});
