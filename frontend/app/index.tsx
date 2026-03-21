import { useEffect } from "react";
import { useRouter } from "expo-router";
import { loadUserProfile } from "@/hooks/useUserProfile";
import { View, ActivityIndicator, Platform } from "react-native";
import TripGuardLanding from "@/components/landing/TripGuardLanding";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    loadUserProfile().then((profile) => {
      if (profile) {
        router.replace("/(tabs)/checklist");
      } else {
        router.replace("/onboarding/profile");
      }
    });
  }, []);

  if (Platform.OS === "web") {
    return <TripGuardLanding />;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}
