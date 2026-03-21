import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface PrimarySafetyFabProps {
  onPrimaryPress: () => void;
  onScanPress: () => void;
}

export default function PrimarySafetyFab({
  onPrimaryPress,
  onScanPress,
}: PrimarySafetyFabProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Check legality"
        onPress={onPrimaryPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <View style={styles.primaryBody}>
          <Ionicons name="shield-checkmark-outline" size={20} color={mobileTheme.colors.textOnDark} />
          <Text style={styles.label}>Check legality</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan to check legality"
          onPress={onScanPress}
          style={({ pressed }) => [styles.scanCapsule, pressed && styles.scanCapsulePressed]}
        >
          <Ionicons name="camera-outline" size={18} color={mobileTheme.colors.textPrimary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
  },
  fab: {
    backgroundColor: mobileTheme.colors.surfaceStrong,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#091321",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.97,
  },
  primaryBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    color: mobileTheme.colors.textOnDark,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scanCapsule: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCapsulePressed: {
    backgroundColor: "#EEE6D9",
  },
});
