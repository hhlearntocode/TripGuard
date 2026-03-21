import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { loadUserProfile } from "@/hooks/useUserProfile";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    loadUserProfile().then((profile) => {
      if (profile) {
        router.replace("/home" as Href);
      } else {
        router.replace("/onboarding/profile");
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <LinearGradient
        colors={["#0A0F1C", "#0D1B2A", "#122333"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}
