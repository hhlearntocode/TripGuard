import React, { ReactNode, RefObject, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { landingTheme } from "@/components/landing/theme";

interface NavItem {
  key: string;
  label: string;
}

interface LandingShellProps {
  children: ReactNode;
  navItems: NavItem[];
  onNavigate: (section: string) => void;
  onStartExploring: () => void;
  scrollRef: RefObject<ScrollView>;
}

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" } as any)
  : null;

export default function LandingShell({
  children,
  navItems,
  onNavigate,
  onStartExploring,
  scrollRef,
}: LandingShellProps) {
  const [skipFocused, setSkipFocused] = useState(false);

  return (
    <View style={styles.page}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip to main content"
        onPress={() => onNavigate("hero")}
        onFocus={() => setSkipFocused(true)}
        onBlur={() => setSkipFocused(false)}
        style={[styles.skipLink, skipFocused && styles.skipLinkVisible]}
      >
        <Text style={styles.skipLinkText}>Skip to main content</Text>
      </Pressable>

      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.glowTopLeft} />
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottom} />
        <View style={styles.gridVeil} />
      </View>

      <View style={[styles.navWrap, webGlass]}>
        <View style={styles.navBrand}>
          <View style={styles.brandMarkOuter}>
            <View style={styles.brandMarkInner} />
          </View>
          <View>
            <Text style={styles.brandTitle}>TripGuard</Text>
            <Text style={styles.brandSub}>AI Legal Companion for Vietnam</Text>
          </View>
        </View>

        <View style={styles.navLinks}>
          {navItems.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${item.label}`}
              onPress={() => onNavigate(item.key)}
              style={({ hovered, pressed }) => [
                styles.navLink,
                hovered && styles.navLinkHovered,
                pressed && styles.navLinkPressed,
              ]}
            >
              <Text style={styles.navLinkText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start exploring TripGuard"
          onPress={onStartExploring}
          style={({ hovered, pressed }) => [
            styles.navCta,
            hovered && styles.navCtaHovered,
            pressed && styles.navCtaPressed,
          ]}
        >
          <Text style={styles.navCtaText}>Start exploring</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: landingTheme.colors.ink,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTopLeft: {
    position: "absolute",
    top: -120,
    left: -60,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(20, 184, 166, 0.22)",
  },
  glowTopRight: {
    position: "absolute",
    top: 120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(215, 182, 137, 0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: "18%",
    width: 460,
    height: 300,
    borderRadius: 220,
    backgroundColor: "rgba(126, 217, 203, 0.12)",
  },
  gridVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: Platform.OS === "web" ? 1 : 0,
  },
  skipLink: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 30,
    opacity: 0,
    transform: [{ translateY: -12 }],
    backgroundColor: landingTheme.colors.pearl,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  skipLinkVisible: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  skipLinkText: {
    color: landingTheme.colors.ink,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
    fontWeight: "600",
  },
  navWrap: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    zIndex: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: "rgba(9, 20, 26, 0.52)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  navBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    flexShrink: 1,
  },
  brandMarkOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(246, 241, 232, 0.18)",
    backgroundColor: "rgba(246, 241, 232, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: landingTheme.colors.teal,
  },
  brandTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 22,
    fontWeight: "600",
  },
  brandSub: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    flex: 1,
  },
  navLink: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navLinkHovered: {
    backgroundColor: "rgba(246, 241, 232, 0.08)",
  },
  navLinkPressed: {
    opacity: 0.72,
  },
  navLinkText: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
    fontWeight: "500",
  },
  navCta: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: landingTheme.colors.pearl,
  },
  navCtaHovered: {
    backgroundColor: "#FFF8ED",
  },
  navCtaPressed: {
    opacity: 0.86,
  },
  navCtaText: {
    color: landingTheme.colors.ink,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 110,
    paddingBottom: 64,
  },
});
