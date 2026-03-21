import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

const TAB_ACTIVE = "#E8D4A6";
const TAB_INACTIVE = "rgba(248, 250, 252, 0.42)";

function TabBarBackground() {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(15, 23, 42, 0.94)" },
        ]}
      />
    );
  }
  return (
    <BlurView
      intensity={72}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 10,
        },
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="checklist"
        options={{
          title: "Checklist",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
