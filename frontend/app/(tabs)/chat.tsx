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
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { loadUserProfile, UserProfile } from "@/hooks/useUserProfile";
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
  const conversationScrollRef = useRef<ScrollView | null>(null);

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

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || isLoading || !profile || !threadReady) return;

    let threadId = activeChatId;
    if (!threadId) {
      const created = await createChatThread();
      threadId = created.chat_id;
      setActiveChatId(threadId);
    }

    const typedQuery = text.trim();
    setUiState("checking");
    setInput("");
    setIsLoading(true);

    const sentAttachments = [...attachments];
    let query = typedQuery || "I attached image(s). Please analyze what this means legally in Vietnam.";
    if (attachments.length > 0) {
      const lines = await Promise.all(
        attachments.map(async (a, i) => {
          if (!a.base64) return `- Image ${i + 1}: attached (analysis unavailable).`;
          try {
            const visionResp = await fetch(`${API_URL}/api/vision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_b64: a.base64 }),
            });
            const sign = await visionResp.json();
            if (sign?.code) {
              return `[Traffic sign in photo: ${sign.code} — "${sign.name}"]`;
            }
            return `- Image ${i + 1}: not recognized as a Vietnamese traffic sign.`;
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
    if ((input.trim() || attachments.length > 0) && !isLoading) {
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

  return (
    <ScreenSurface
      title="Legality Check"
      subtitle={getLegalityTone(uiState)}
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
                            <Text style={styles.chatBubbleText}>{item.content}</Text>
                            {item.role === "assistant" && !!item.sources?.length && (
                              <View style={styles.sourcesBlock}>
                                <Text style={styles.sourcesLabel}>Sources</Text>
                                {item.sources.map((src, i) => {
                                  const isUrl = src.startsWith("http");
                                  return isUrl ? (
                                    <TouchableOpacity key={i} onPress={() => Linking.openURL(src)}>
                                      <Text style={styles.sourceLink} numberOfLines={1}>{src}</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <Text key={i} style={styles.sourceRef}>{src}</Text>
                                  );
                                })}
                              </View>
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
                              <Text style={styles.resultAnswer}>{item.content}</Text>
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
                          <Text style={styles.chatBubbleText}>{item.content}</Text>
                          {item.role === "assistant" && !!item.sources?.length && (
                            <View style={styles.sourcesBlock}>
                              <Text style={styles.sourcesLabel}>Sources</Text>
                              {item.sources.map((src, i) => {
                                const isUrl = src.startsWith("http");
                                return isUrl ? (
                                  <TouchableOpacity key={i} onPress={() => Linking.openURL(src)}>
                                    <Text style={styles.sourceLink} numberOfLines={1}>{src}</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <Text key={i} style={styles.sourceRef}>{src}</Text>
                                );
                              })}
                            </View>
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
                            <Text style={styles.resultAnswer}>{item.content}</Text>
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
                  onKeyPress={handleComposerKeyPress}
                  onSubmitEditing={() => sendMessage(input)}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!input.trim() && attachments.length === 0 || isLoading) && styles.sendBtnDisabled,
                  ]}
                  onPress={() => sendMessage(input)}
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
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
  resultAnswer: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
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
  sourcesBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 36, 59, 0.08)",
    gap: 4,
  },
  sourcesLabel: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: mobileTheme.colors.textSecondary,
    marginBottom: 4,
  },
  sourceLink: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    color: mobileTheme.colors.primary,
    textDecorationLine: "underline",
    lineHeight: 18,
  },
  sourceRef: {
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    color: mobileTheme.colors.textSecondary,
    lineHeight: 18,
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
