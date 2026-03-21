import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

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

interface Props {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  sources?: string[];
  toolsUsed?: ToolCall[];
  signInfo?: SignInfo;
  imageUri?: string;
}

const TOOL_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  retrieve_law:        { icon: "library-outline",       label: "Retrieved law",    color: COLORS.teal },
  lookup_fine:         { icon: "cash-outline",          label: "Looked up fine",   color: COLORS.warn },
  get_emergency_steps: { icon: "alert-circle-outline",  label: "Emergency guide",  color: COLORS.error },
  web_search:          { icon: "search-outline",        label: "Web search",       color: "#818CF8" },
  scrape_url:          { icon: "globe-outline",         label: "Scraped URL",      color: "#818CF8" },
};

function toolSummary(tool: string, args: Record<string, any>): string {
  if (tool === "retrieve_law")        return args.query ?? "";
  if (tool === "lookup_fine")         return `${args.violation ?? ""}${args.vehicle ? ` · ${args.vehicle}` : ""}`;
  if (tool === "get_emergency_steps") return args.scenario ?? "";
  if (tool === "web_search")          return args.query ?? "";
  if (tool === "scrape_url")          return args.url ?? "";
  return "";
}

function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

function signCategoryIcon(category?: string): string {
  if (!category) return "🚦";
  const c = category.toLowerCase();
  if (c.includes("prohibit") || c.includes("no ") || c.includes("ban")) return "🚫";
  if (c.includes("warn") || c.includes("danger") || c.includes("caution")) return "⚠️";
  if (c.includes("mandatory") || c.includes("compulsory")) return "🔵";
  if (c.includes("info") || c.includes("guide")) return "ℹ️";
  return "🚦";
}

export default function ChatBubble({ role, content, isLoading, sources, toolsUsed, signInfo, imageUri }: Props) {
  const [activityOpen, setActivityOpen] = useState(false);
  const isUser = role === "user";

  if (isLoading) {
    return (
      <View style={[styles.row, styles.rowAssistant]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🛡️</Text>
        </View>
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.teal} />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        </View>
      </View>
    );
  }

  const hasSources = !isUser && sources && sources.length > 0;
  const hasActivity = !isUser && toolsUsed && toolsUsed.length > 0;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🛡️</Text>
        </View>
      )}
      <View style={[styles.bubbleCol, isUser && styles.bubbleColUser]}>

        {/* Agent activity panel */}
        {hasActivity && (
          <View style={styles.activityWrap}>
            <TouchableOpacity style={styles.activityHeader} onPress={() => setActivityOpen((o) => !o)}>
              <Ionicons name="git-branch-outline" size={13} color={COLORS.teal} />
              <Text style={styles.activityHeaderText}>
                {toolsUsed!.length} agent step{toolsUsed!.length > 1 ? "s" : ""}
              </Text>
              <Ionicons
                name={activityOpen ? "chevron-up" : "chevron-down"}
                size={12}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            {activityOpen && (
              <View style={styles.activitySteps}>
                {toolsUsed!.map((tc, i) => {
                  const meta = TOOL_META[tc.tool] ?? { icon: "ellipse-outline", label: tc.tool, color: COLORS.textMuted };
                  const summary = toolSummary(tc.tool, tc.args);
                  return (
                    <View key={i} style={styles.stepRow}>
                      <View style={[styles.stepIcon, { backgroundColor: meta.color + "20", borderColor: meta.color + "40" }]}>
                        <Ionicons name={meta.icon} size={13} color={meta.color} />
                      </View>
                      <View style={styles.stepBody}>
                        <Text style={[styles.stepLabel, { color: meta.color }]}>{meta.label}</Text>
                        {!!summary && (
                          <Text style={styles.stepSummary} numberOfLines={2}>{summary}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
        {/* User bubble — image + sign info or plain text, all inside one container */}
        {isUser ? (
          <View style={[styles.bubble, styles.bubbleUser, !!imageUri && styles.bubbleWithMedia]}>
            {!!imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.imageInBubble}
                resizeMode="cover"
              />
            )}
            {signInfo && (
              <View style={styles.signInfoInBubble}>
                <View style={styles.signCodeRow}>
                  <Text style={styles.signCategoryIcon}>{signCategoryIcon(signInfo.category)}</Text>
                  <Text style={styles.signCode}>{signInfo.code}</Text>
                  <View style={styles.qcvnBadge}>
                    <Text style={styles.qcvnText}>QCVN 41:2024</Text>
                  </View>
                </View>
                <Text style={styles.signName}>{signInfo.name}</Text>
                <Text style={styles.signMeaning}>{signInfo.meaning}</Text>
              </View>
            )}
            {!!content && (
              <Text style={[styles.text, styles.textUser, (!!imageUri || !!signInfo) && styles.textBelowImage]}>
                {content}
              </Text>
            )}
          </View>
        ) : (
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <Text style={[styles.text, styles.textAssistant]}>
              {content}
            </Text>
          </View>
        )}

        {hasSources && (
          <View style={styles.sourcesWrap}>
            <Text style={styles.sourcesLabel}>⚖️  References</Text>
            {sources!.map((ref) => {
              const isUrl = ref.startsWith("http");
              return isUrl ? (
                <TouchableOpacity
                  key={ref}
                  style={styles.sourceChip}
                  onPress={() => Linking.openURL(ref)}
                >
                  <Ionicons name="globe-outline" size={12} color={COLORS.teal} />
                  <Text style={styles.sourceText} numberOfLines={1}>{domainLabel(ref)}</Text>
                  <Ionicons name="open-outline" size={11} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <View key={ref} style={styles.lawChip}>
                  <Ionicons name="document-text-outline" size={12} color={COLORS.teal} />
                  <Text style={styles.sourceText} numberOfLines={2}>{ref}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.tealGlass,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16 },

  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.teal,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.glassMid,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderBottomLeftRadius: 4,
  },

  text: { fontSize: 15, lineHeight: 22 },
  textUser: { color: "#fff", fontWeight: "500" },
  textAssistant: { color: COLORS.textPrimary },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: COLORS.textSecondary },

  bubbleCol: { flex: 1, maxWidth: "85%", gap: 6 },
  bubbleColUser: { alignItems: "flex-end" },

  activityWrap: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 12,
    overflow: "hidden",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activityHeaderText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "600",
  },
  activitySteps: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    padding: 8,
    gap: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBody: { flex: 1 },
  stepLabel: { fontSize: 12, fontWeight: "700" },
  stepSummary: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 15 },

  bubbleWithMedia: {
    padding: 0,
    overflow: "hidden",
  },
  imageInBubble: {
    width: 220,
    height: 180,
  },
  signInfoInBubble: {
    padding: 12,
    gap: 4,
  },
  signCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  signCategoryIcon: { fontSize: 16 },
  signCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  qcvnBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  qcvnText: { fontSize: 9, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  signName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
  },
  signMeaning: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 17,
    marginTop: 2,
  },
  textBelowImage: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  sourcesWrap: { marginTop: 6, gap: 5 },
  sourcesLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 2 },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.tealGlass,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  lawChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  sourceText: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "500",
    maxWidth: 220,
  },
});
