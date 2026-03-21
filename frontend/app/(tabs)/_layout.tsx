import { Tabs } from "expo-router";
import { Platform, View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS } from "@/constants/theme";

type TabBarIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
};

function GlassTabIcon({ name, focused, label }: TabBarIconProps) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? COLORS.teal : COLORS.textMuted}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function GlassTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarWrapper}>
      <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              chat: focused ? "chatbubble" : "chatbubble-outline",
              checklist: focused ? "shield-checkmark" : "shield-checkmark-outline",
              emergency: focused ? "alert-circle" : "alert-circle-outline",
            };

            return (
              <View key={route.key} style={styles.tabBtn}>
                <GlassTabIcon
                  name={icons[route.name] || "ellipse-outline"}
                  focused={focused}
                  label={options.title || route.name}
                />
                <Text
                  style={styles.touchTarget}
                  onPress={onPress}
                  accessibilityRole="button"
                />
              </View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="checklist" options={{ title: "Checklist" }} />
      <Tabs.Screen name="emergency" options={{ title: "Emergency" }} />
    </Tabs>
  );
}

const TAB_HEIGHT = Platform.OS === "ios" ? 88 : 64;

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_HEIGHT,
  },
  blurContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    overflow: "hidden",
  },
  tabBarInner: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(10, 22, 40, 0.55)",
    paddingBottom: Platform.OS === "ios" ? 24 : 4,
  },
  tabBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: COLORS.tealGlass,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: COLORS.teal,
    fontWeight: "700",
  },
  touchTarget: {
    ...StyleSheet.absoluteFillObject,
  },
});
