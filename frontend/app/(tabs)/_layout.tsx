import { Stack } from "expo-router";

export default function TabLayout() {
  return (
    <Stack initialRouteName="chat" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chat" />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="emergency" />
    </Stack>
  );
}
