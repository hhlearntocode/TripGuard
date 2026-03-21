import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loadChatHistory, ChatHistoryEntry } from "@/hooks/useChatHistory";
import { mobileTheme } from "@/theme/mobileTheme";

export default function AppDashboardMenu() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);

  useEffect(() => {
    if (!menuOpen) return;
    loadChatHistory().then(setHistory);
  }, [menuOpen]);

  return (
    <>
      <TouchableOpacity style={styles.iconBtn} onPress={() => setMenuOpen(true)}>
        <Ionicons name="menu" size={20} color={mobileTheme.colors.textPrimary} />
      </TouchableOpacity>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.menuModal}>
          <View style={styles.menuDrawer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Dashboard</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Ionicons name="close" size={20} color={mobileTheme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/(tabs)/chat");
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={mobileTheme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/(tabs)/checklist");
              }}
            >
              <Ionicons name="compass-outline" size={18} color={mobileTheme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Travel Briefing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/(tabs)/emergency");
              }}
            >
              <Ionicons name="pulse-outline" size={18} color={mobileTheme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Emergency</Text>
            </TouchableOpacity>

            <Text style={styles.menuSectionTitle}>Chat history</Text>
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <Text style={styles.historyEmpty}>No chat history yet.</Text>
              ) : (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push({ pathname: "/(tabs)/chat", params: { query: item.query } });
                    }}
                  >
                    <Text style={styles.historyQuery} numberOfLines={1}>
                      {item.query}
                    </Text>
                    <Text style={styles.historyPreview} numberOfLines={1}>
                      {item.preview || "Saved scenario"}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  menuModal: {
    flex: 1,
    flexDirection: "row",
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 15, 25, 0.28)",
  },
  menuDrawer: {
    width: 320,
    maxWidth: "84%",
    backgroundColor: mobileTheme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: mobileTheme.colors.line,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 24,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  menuTitle: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 22,
    fontWeight: "700",
  },
  menuItem: {
    backgroundColor: mobileTheme.colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mobileTheme.colors.line,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  menuItemText: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    fontWeight: "600",
  },
  menuSectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  historyList: {
    flex: 1,
  },
  historyEmpty: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.line,
    paddingVertical: 10,
    gap: 3,
  },
  historyQuery: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    fontWeight: "600",
  },
  historyPreview: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 12,
  },
});
