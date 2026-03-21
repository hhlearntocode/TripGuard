import { useEffect } from "react";
import { useRouter } from "expo-router";
import { loadUserProfile } from "@/hooks/useUserProfile";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/constants/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    loadUserProfile().then((profile) => {
      if (profile) {
        router.replace("/(tabs)/chat");
      } else {
        router.replace("/onboarding/profile");
      }
    });
  }, []);

  return (
    <LinearGradient
      colors={[COLORS.bg, COLORS.bg2]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <ActivityIndicator size="large" color={COLORS.teal} />
    </LinearGradient>
  );
}
