import { Stack } from "expo-router";

/**
 * Homepage stack at `/home` — landing (`index`) + concierge chat (`chat`).
 * Groups avoid clashing with root `app/index.tsx` (auth gate).
 */
export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#070B14" },
        animation: "slide_from_right",
      }}
    />
  );
}
