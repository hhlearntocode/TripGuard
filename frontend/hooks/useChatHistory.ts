import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_HISTORY_KEY = "tripguard_chat_history";
const ASSESSMENT_DISMISS_KEY = "tripguard_assessment_dismissals";
const MAX_THREADS = 40;
const MAX_MESSAGES_PER_THREAD = 80;

export interface ChatThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  state?: string;
  created_at: string;
  attachments?: Array<{ uri: string }>;
  sources?: string[];
}

export interface ChatThread {
  chat_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatThreadMessage[];
}

export interface ChatThreadSummary {
  chat_id: string;
  title: string;
  preview: string;
  updated_at: string;
  message_count: number;
}

export interface ChatHistoryEntry {
  id: string;
  query: string;
  preview: string;
  created_at: string;
}

function makeId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadRawThreads(): Promise<ChatThread[]> {
  const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    // Backward compatibility for old flat history schema.
    if (parsed.length > 0 && parsed[0] && typeof parsed[0] === "object" && "query" in (parsed[0] as Record<string, unknown>)) {
      const migrated = (parsed as Array<{ id: string; query: string; preview: string; created_at: string }>).map((entry) => ({
        chat_id: `chat-${entry.id}`,
        title: entry.query.slice(0, 60) || "New chat",
        created_at: entry.created_at,
        updated_at: entry.created_at,
        messages: [
          {
            id: makeId("msg"),
            role: "user" as const,
            content: entry.query,
            created_at: entry.created_at,
          },
          {
            id: makeId("msg"),
            role: "assistant" as const,
            content: entry.preview || "Saved response",
            created_at: entry.created_at,
          },
        ],
      }));
      await saveThreads(migrated);
      return migrated;
    }

    return (parsed as ChatThread[])
      .filter((thread) => !!thread.chat_id && Array.isArray(thread.messages))
      .map((thread) => ({
        ...thread,
        messages: thread.messages
          .filter((message) => !!message && (message.role === "user" || message.role === "assistant"))
          .map((message) => {
            const normalizedAttachments = Array.isArray(message.attachments)
              ? message.attachments
                  .filter((attachment) => !!attachment && typeof attachment.uri === "string")
                  .map((attachment) => ({ uri: attachment.uri }))
              : undefined;
            const normalizedSources = Array.isArray(message.sources)
              ? message.sources.filter((source) => typeof source === "string")
              : undefined;
            return {
              ...message,
              attachments: normalizedAttachments && normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
              sources: normalizedSources && normalizedSources.length > 0 ? normalizedSources : undefined,
            };
          }),
      }));
  } catch {
    return [];
  }
}

async function saveThreads(threads: ChatThread[]): Promise<void> {
  await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)));
}

export async function loadChatThreads(): Promise<ChatThread[]> {
  const threads = await loadRawThreads();
  return [...threads].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function loadChatThread(chatId: string): Promise<ChatThread | null> {
  const threads = await loadChatThreads();
  return threads.find((thread) => thread.chat_id === chatId) || null;
}

export async function createChatThread(title = "New chat"): Promise<ChatThread> {
  const now = new Date().toISOString();
  const next: ChatThread = {
    chat_id: makeId("chat"),
    title,
    created_at: now,
    updated_at: now,
    messages: [],
  };
  const threads = await loadChatThreads();
  await saveThreads([next, ...threads]);
  return next;
}

export async function appendMessageToThread(
  chatId: string,
  message: Omit<ChatThreadMessage, "id" | "created_at"> & { id?: string; created_at?: string }
): Promise<ChatThread | null> {
  const threads = await loadChatThreads();
  const idx = threads.findIndex((thread) => thread.chat_id === chatId);
  if (idx < 0) return null;

  const nextMessage: ChatThreadMessage = {
    id: message.id || makeId("msg"),
    role: message.role,
    content: message.content,
    state: message.state,
    created_at: message.created_at || new Date().toISOString(),
    attachments: message.attachments?.filter((attachment) => !!attachment?.uri),
    sources: message.sources?.filter((source) => typeof source === "string"),
  };

  const updated: ChatThread = {
    ...threads[idx],
    updated_at: new Date().toISOString(),
    messages: [...threads[idx].messages, nextMessage].slice(-MAX_MESSAGES_PER_THREAD),
  };

  const nextThreads = [updated, ...threads.filter((thread) => thread.chat_id !== chatId)];
  await saveThreads(nextThreads);
  return updated;
}

export async function updateChatThreadTitle(chatId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  const threads = await loadChatThreads();
  const idx = threads.findIndex((thread) => thread.chat_id === chatId);
  if (idx < 0) return;

  const updated: ChatThread = {
    ...threads[idx],
    title: trimmed.slice(0, 70),
    updated_at: new Date().toISOString(),
  };
  const nextThreads = [updated, ...threads.filter((thread) => thread.chat_id !== chatId)];
  await saveThreads(nextThreads);
}

export async function clearChatThreadMessages(chatId: string): Promise<ChatThread | null> {
  const threads = await loadChatThreads();
  const idx = threads.findIndex((thread) => thread.chat_id === chatId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const updated: ChatThread = {
    ...threads[idx],
    messages: [],
    updated_at: now,
  };
  const nextThreads = [updated, ...threads.filter((thread) => thread.chat_id !== chatId)];
  await saveThreads(nextThreads);
  return updated;
}

type AssessmentDismissals = Record<string, string[]>;

async function loadDismissMap(): Promise<AssessmentDismissals> {
  const raw = await AsyncStorage.getItem(ASSESSMENT_DISMISS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AssessmentDismissals;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveDismissMap(data: AssessmentDismissals): Promise<void> {
  await AsyncStorage.setItem(ASSESSMENT_DISMISS_KEY, JSON.stringify(data));
}

export async function loadDismissedAssessmentIds(chatId: string): Promise<string[]> {
  const map = await loadDismissMap();
  return map[chatId] || [];
}

export async function dismissAssessmentForThread(chatId: string, assistantMessageId: string): Promise<void> {
  const map = await loadDismissMap();
  const current = map[chatId] || [];
  if (current.includes(assistantMessageId)) return;
  map[chatId] = [assistantMessageId, ...current];
  await saveDismissMap(map);
}

export async function loadChatThreadSummaries(): Promise<ChatThreadSummary[]> {
  const threads = await loadChatThreads();
  return threads.map((thread) => {
    const lastAssistant = [...thread.messages].reverse().find((m) => m.role === "assistant");
    const lastUser = [...thread.messages].reverse().find((m) => m.role === "user");
    return {
      chat_id: thread.chat_id,
      title: thread.title || "New chat",
      preview: (lastAssistant?.content || lastUser?.content || "No messages yet").slice(0, 120),
      updated_at: thread.updated_at,
      message_count: thread.messages.length,
    };
  });
}

export async function loadChatHistory(): Promise<ChatHistoryEntry[]> {
  const threads = await loadChatThreads();

  return threads.flatMap((thread) => {
    const entries: ChatHistoryEntry[] = [];

    for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
      const current = thread.messages[i];
      if (current.role !== "assistant") continue;

      let query = thread.title || "Scenario";
      for (let j = i - 1; j >= 0; j -= 1) {
        if (thread.messages[j].role === "user") {
          query = thread.messages[j].content;
          break;
        }
      }

      entries.push({
        id: current.id,
        query,
        preview: current.content.slice(0, 120) || "Saved response",
        created_at: current.created_at,
      });
    }

    return entries;
  });
}
