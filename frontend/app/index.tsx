import { useEffect } from "react";
import { useRouter } from "expo-router";
import { loadUserProfile } from "@/hooks/useUserProfile";
import { View, ActivityIndicator } from "react-native";

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
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}
