// TripGuard Design System — Liquid Glass + Glassmorphism

export const COLORS = {
  // Backgrounds
  bg: "#0A1628",
  bg2: "#0D2137",
  bgCard: "#0F1E35",

  // Glass layers
  glass: "rgba(255, 255, 255, 0.08)",
  glassMid: "rgba(255, 255, 255, 0.12)",
  glassHigh: "rgba(255, 255, 255, 0.18)",
  glassBorder: "rgba(255, 255, 255, 0.15)",
  glassBorderHigh: "rgba(255, 255, 255, 0.25)",

  // Accent
  teal: "#14B8A6",
  tealLight: "#2DD4BF",
  tealGlass: "rgba(20, 184, 166, 0.18)",
  tealBorder: "rgba(20, 184, 166, 0.35)",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.65)",
  textMuted: "rgba(255, 255, 255, 0.38)",

  // Status
  ok: "#10B981",
  okGlass: "rgba(16, 185, 129, 0.15)",
  okBorder: "rgba(16, 185, 129, 0.3)",

  warn: "#F59E0B",
  warnGlass: "rgba(245, 158, 11, 0.15)",
  warnBorder: "rgba(245, 158, 11, 0.3)",

  error: "#EF4444",
  errorGlass: "rgba(239, 68, 68, 0.15)",
  errorBorder: "rgba(239, 68, 68, 0.3)",

  // Overlay
  overlay: "rgba(10, 22, 40, 0.6)",
};

export const GLASS_CARD = {
  backgroundColor: COLORS.glass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: 16,
};

export const GLASS_CARD_HIGH = {
  backgroundColor: COLORS.glassMid,
  borderWidth: 1,
  borderColor: COLORS.glassBorderHigh,
  borderRadius: 16,
};
