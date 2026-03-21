import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { landingTheme } from "@/components/landing/theme";

interface MembershipCtaProps {
  onStartExploring: () => void;
}

const webGlass = Platform.OS === "web"
  ? ({ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" } as any)
  : null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MembershipCta({ onStartExploring }: MembershipCtaProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [travelWindow, setTravelWindow] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!isSubmitting) return;

    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);

    return () => clearTimeout(timeout);
  }, [isSubmitting]);

  const helperText = useMemo(() => {
    if (submitted) {
      return "Access request received. Early members will be invited before the broader release.";
    }

    if (nameError || emailError) {
      return "Complete the required fields to request private access.";
    }

    return "Membership is an early-access list for travelers who want TripGuard before general release.";
  }, [emailError, nameError, submitted]);

  function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const nextNameError = trimmedName ? "" : "Name is required.";
    const nextEmailError = EMAIL_PATTERN.test(trimmedEmail) ? "" : "Enter a valid email address.";

    setNameError(nextNameError);
    setEmailError(nextEmailError);

    if (nextNameError || nextEmailError) {
      setSubmitted(false);
      return;
    }

    setSubmitted(false);
    setIsSubmitting(true);
  }

  return (
    <View style={styles.section}>
      <View style={styles.copyCol}>
        <Text style={styles.eyebrow}>Exclusive membership</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          Request private access before TripGuard opens more broadly.
        </Text>
        <Text style={styles.body}>
          This first membership list is for travelers who want early entry into a more deliberate legal travel experience for Vietnam.
        </Text>
        <Text style={[styles.helper, submitted && styles.helperSuccess]}>
          {helperText}
        </Text>
      </View>

      <View style={[styles.formCard, webGlass]}>
        <Text style={styles.formTitle}>Private membership request</Text>
        <Text style={styles.formSub}>
          Share the minimum detail required for a tailored early-access invite.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput
            accessibilityLabel="Full name"
            autoCapitalize="words"
            placeholder="Your name"
            placeholderTextColor="rgba(246, 241, 232, 0.42)"
            style={[styles.input, !!nameError && styles.inputError]}
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (nameError) setNameError("");
            }}
          />
          {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="rgba(246, 241, 232, 0.42)"
            style={[styles.input, !!emailError && styles.inputError]}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) setEmailError("");
            }}
          />
          {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Travel window</Text>
          <TextInput
            accessibilityLabel="Travel window"
            placeholder="Optional: May 2026"
            placeholderTextColor="rgba(246, 241, 232, 0.42)"
            style={styles.input}
            value={travelWindow}
            onChangeText={setTravelWindow}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request private access"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ hovered, pressed }) => [
              styles.submitButton,
              hovered && !isSubmitting && styles.submitButtonHovered,
              pressed && !isSubmitting && styles.submitButtonPressed,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Processing request..." : submitted ? "Access requested" : "Request access"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start exploring TripGuard"
            onPress={onStartExploring}
            style={({ hovered, pressed }) => [
              styles.ghostButton,
              hovered && styles.ghostButtonHovered,
              pressed && styles.ghostButtonPressed,
            ]}
          >
            <Text style={styles.ghostButtonText}>Start exploring</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          TripGuard provides legal information for travel scenarios in Vietnam. It does not replace legal advice.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
  },
  copyCol: {
    flex: 1,
    minWidth: 280,
    maxWidth: 560,
    gap: 12,
  },
  eyebrow: {
    color: landingTheme.colors.tealMuted,
    fontFamily: landingTheme.fonts.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: "600",
  },
  body: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 16,
    lineHeight: 28,
  },
  helper: {
    color: landingTheme.colors.champagne,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  helperSuccess: {
    color: landingTheme.colors.success,
  },
  formCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
    backgroundColor: landingTheme.colors.panelStrong,
    padding: 24,
    gap: 14,
  },
  formTitle: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.display,
    fontSize: 30,
    fontWeight: "600",
  },
  formSub: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(246, 241, 232, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 15,
  },
  inputError: {
    borderColor: "rgba(247, 182, 176, 0.8)",
  },
  errorText: {
    color: landingTheme.colors.error,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: landingTheme.colors.champagne,
  },
  submitButtonHovered: {
    backgroundColor: "#E5C598",
  },
  submitButtonPressed: {
    opacity: 0.84,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    color: landingTheme.colors.ink,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  ghostButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: landingTheme.colors.line,
  },
  ghostButtonHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  ghostButtonPressed: {
    opacity: 0.82,
  },
  ghostButtonText: {
    color: landingTheme.colors.pearl,
    fontFamily: landingTheme.fonts.body,
    fontSize: 14,
    fontWeight: "600",
  },
  disclaimer: {
    color: landingTheme.colors.mist,
    fontFamily: landingTheme.fonts.body,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 4,
  },
});
