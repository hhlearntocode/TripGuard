import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/mobileTheme";

interface HoldToConfirmProps {
  label: string;
  hint: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export default function HoldToConfirm({
  label,
  hint,
  onConfirm,
  disabled = false,
}: HoldToConfirmProps) {
  const [pressing, setPressing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirm() {
    if (disabled || confirmed) return;
    setConfirmed(true);
    onConfirm();
  }

  return (
    <View style={[styles.wrap, disabled && styles.wrapDisabled]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || confirmed}
        delayLongPress={650}
        onPressIn={() => setPressing(true)}
        onPressOut={() => setPressing(false)}
        onLongPress={handleConfirm}
        style={({ pressed }) => [
          styles.button,
          pressing && styles.buttonPressing,
          pressed && styles.buttonPressed,
          confirmed && styles.buttonConfirmed,
        ]}
      >
        <Ionicons
          name={confirmed ? "shield-checkmark-outline" : "shield-half-outline"}
          size={18}
          color={confirmed ? mobileTheme.colors.success : mobileTheme.colors.textOnDark}
        />
        <Text style={[styles.buttonLabel, confirmed && styles.buttonLabelConfirmed]}>
          {confirmed ? "Protected access granted" : label}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        {confirmed ? "Profile sealed. Routing into protected mode." : hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  wrapDisabled: {
    opacity: 0.6,
  },
  button: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  buttonPressing: {
    backgroundColor: "#163153",
  },
  buttonPressed: {
    opacity: 0.96,
  },
  buttonConfirmed: {
    backgroundColor: mobileTheme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(31, 107, 87, 0.22)",
  },
  buttonLabel: {
    color: mobileTheme.colors.textOnDark,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  buttonLabelConfirmed: {
    color: mobileTheme.colors.success,
  },
  hint: {
    color: mobileTheme.colors.textSecondary,
    fontFamily: mobileTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
