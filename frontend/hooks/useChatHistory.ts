import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_HISTORY_KEY = "tripguard_chat_history";
const MAX_HISTORY = 30;

export interface ChatHistoryEntry {
  id: string;
  query: string;
  preview: string;
  created_at: string;
}

export async function loadChatHistory(): Promise<ChatHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ChatHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendChatHistory(entry: ChatHistoryEntry): Promise<void> {
  const current = await loadChatHistory();
  const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
}
