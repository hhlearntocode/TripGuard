import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import GlassPanel from "@/components/GlassPanel";
import { UUPM_LIQUID_GLASS as U } from "@/constants/uupmLiquidGlass";

/**
 * Homepage — extend with your luxury landing (hero, membership, story).
 * Tokens: UI/UX Pro Max Glassmorphism + Liquid Glass (`constants/uupmLiquidGlass.ts`).
 */
export default function HomePage() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...U.cinematic.background]}
        locations={[...U.cinematic.locations]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(0, 128, 255, 0.06)", "transparent", "rgba(32, 178, 170, 0.05)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Text style={styles.kicker}>TripGuard</Text>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.sub}>
            Your homepage continues here — hero, membership, and brand story live on this route
            (`/home`).
          </Text>

          <GlassPanel intensity={U.glass.headerBlurIntensity} tint="dark" style={styles.card}>
            <Text style={styles.cardLabel}>Concierge</Text>
            <Text style={styles.cardBody}>
              Liquid glass chat (UI/UX Pro Max: Glassmorphism + Liquid Glass) is a sub-page:
              `/home/chat`.
            </Text>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push("/home/chat" as Href)}
              style={styles.ctaWrap}
            >
              <LinearGradient
                colors={[U.accent.gold, U.accent.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#0F172A" />
                <Text style={styles.ctaText}>Open legal concierge</Text>
                <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              </LinearGradient>
            </TouchableOpacity>
          </GlassPanel>

          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.push("/(tabs)/checklist")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>Checklist & tools</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(248,250,252,0.5)" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: U.cinematic.background[0] },
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    justifyContent: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "600",
    color: U.accent.gold,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(248, 250, 252, 0.58)",
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: U.glass.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(248, 250, 252, 0.45)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(248, 250, 252, 0.78)",
    marginBottom: 20,
  },
  ctaWrap: { borderRadius: 16, overflow: "hidden" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: Platform.OS === "ios" ? 16 : 14,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 15,
    color: "rgba(248, 250, 252, 0.5)",
    fontWeight: "500",
  },
});
