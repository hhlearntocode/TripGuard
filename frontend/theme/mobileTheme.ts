import { Platform } from "react-native";

export const mobileTheme = {
  colors: {
    background: "#F6F1E8",
    surface: "#FFFFFF",
    surfaceAlt: "#F0E7D8",
    surfaceStrong: "#10243B",
    surfaceMuted: "#E9E1D5",
    primary: "#1E3A8A",
    primarySoft: "#DEE7FB",
    gold: "#B45309",
    goldSoft: "#FCE7D0",
    success: "#1F6B57",
    successSoft: "#E4F3EC",
    warning: "#A16207",
    warningSoft: "#FFF4D8",
    danger: "#A12E2E",
    dangerSoft: "#FDE8E8",
    textPrimary: "#10243B",
    textSecondary: "#5B6777",
    textOnDark: "#F8F4EC",
    line: "#D9D0C3",
  },
  fonts: {
    display: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "Georgia",
    }),
    body: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "System",
    }),
  },
};
