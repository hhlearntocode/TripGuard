import React, { ReactNode } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface ScreenSurfaceProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  leftNode?: ReactNode;
  rightNode?: ReactNode;
  scrollable?: boolean;
}

export default function ScreenSurface({
  title,
  subtitle,
  children,
  leftNode,
  rightNode,
  scrollable = true,
}: ScreenSurfaceProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.background}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      <View style={styles.header}>
        <View style={styles.headerSide}>{leftNode}</View>
        <View style={styles.headerCopyWrap}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={[styles.headerSide, styles.headerSideRight]}>{rightNode}</View>
      </View>

      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.staticContent}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTop: {
    position: "absolute",
    top: -70,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(180, 83, 9, 0.10)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -80,
    left: -10,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "rgba(30, 58, 138, 0.08)",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopyWrap: {
    flex: 1,
  },
  headerCopy: {
    gap: 6,
  },
  headerSide: {
    minWidth: 34,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontFamily: mobileTheme.fonts.display,
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
});
