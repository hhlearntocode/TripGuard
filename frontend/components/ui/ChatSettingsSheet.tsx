import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loadChatHistory, ChatHistoryEntry } from "@/hooks/useChatHistory";
import { mobileTheme } from "@/theme/mobileTheme";

interface ChatSettingsSheetProps {
  currentQuery?: string;
}

export default function ChatSettingsSheet({ currentQuery }: ChatSettingsSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);

  useEffect(() => {
    if (!open || !showHistory) return;
    loadChatHistory().then(setHistory);
  }, [open, showHistory]);

  const closeAll = () => {
    setOpen(false);
    setShowHistory(false);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open chat settings"
        style={styles.iconBtn}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="settings-outline" size={18} color={mobileTheme.colors.textPrimary} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.backdrop} onPress={closeAll}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {!showHistory ? (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Chat settings</Text>
                  <TouchableOpacity onPress={closeAll}>
                    <Ionicons name="close" size={18} color={mobileTheme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => setShowHistory(true)}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="time-outline" size={17} color={mobileTheme.colors.primary} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>Assessment Log</Text>
                    <Text style={styles.actionBody}>Open saved legality checks on demand.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    closeAll();
                    router.push("/onboarding/profile");
                  }}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="person-outline" size={17} color={mobileTheme.colors.primary} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>Travel Profile</Text>
                    <Text style={styles.actionBody}>Review nationality, visa, and travel context.</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setShowHistory(false)}>
                    <Ionicons name="arrow-back" size={18} color={mobileTheme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.title}>Assessment Log</Text>
                  <TouchableOpacity onPress={closeAll}>
                    <Ionicons name="close" size={18} color={mobileTheme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                  {history.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No saved assessments</Text>
                      <Text style={styles.emptyBody}>
                        Checks you run here will appear in this log for quick recall.
                      </Text>
                    </View>
                  ) : (
                    history.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.historyItem,
                          currentQuery === item.query && styles.historyItemActive,
                        ]}
                        onPress={() => {
                          closeAll();
                          router.push({ pathname: "/(tabs)/chat", params: { query: item.query } });
                        }}
                      >
                        <Text style={styles.historyQuery} numberOfLines={2}>
                          {item.query}
                        </Text>
                        <Text style={styles.historyPreview} numberOfLines={2}>
                          {item.preview || "Saved scenario"}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFFE6",
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 35, 0.24)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FCFAF7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    minHeight: 280,
    maxHeight: "72%",
    shadowColor: "#0B1423",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 17,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F5EDE3",
    marginBottom: 10,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFFD9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  actionBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: "#F7F1E9",
    borderRadius: 18,
    padding: 14,
    gap: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E4D8C9",
  },
  historyItemActive: {
    borderColor: mobileTheme.colors.primary,
    backgroundColor: "#EEF3FF",
  },
  historyQuery: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  historyPreview: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 20,
    gap: 6,
  },
  emptyTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyBody: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
