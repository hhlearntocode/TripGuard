/**
 * UI/UX Pro Max — design tokens applied to TripGuard concierge chat.
 *
 * Source: nextlevelbuilder/ui-ux-pro-max-skill
 * `src/ui-ux-pro-max/data/styles.csv`
 *
 * - Glassmorphism (row 3): backdrop blur 10–20px; translucent white rgba(255,255,255,0.1–0.3);
 *   1px border rgba(255,255,255,0.2); layered depth / light edge.
 * - Liquid Glass (row 14): fluid / iridescent gradients; dynamic blur; smooth 400–600ms transitions.
 * - Modern Dark Cinema Mobile (row 71): React Native — BlurView on chrome, hairline rgba(255,255,255,0.08),
 *   avoid pure black; cinematic gradient base.
 *
 * expo-blur `intensity` is 0–100; values below approximate ~15px CSS backdrop blur on device.
 */
export const UUPM_LIQUID_GLASS = {
  glass: {
    headerBlurIntensity: 52,
    composerBlurIntensity: 58,
    assistantBubbleBlur: 38,
    /** Glassmorphism translucent panel */
    fill: "rgba(255, 255, 255, 0.15)",
    border: "rgba(255, 255, 255, 0.2)",
    borderSubtle: "rgba(255, 255, 255, 0.12)",
    hairline: "rgba(255, 255, 255, 0.08)",
  },
  liquid: {
    transitionMs: 500,
    iridescent: {
      electricBlue: "#0080FF",
      neonPurple: "#8B00FF",
      vividPink: "#FF1493",
      teal: "#20B2AA",
    },
  },
  cinematic: {
    background: ["#070B14", "#0F172A", "#132238", "#0B1220"] as const,
    locations: [0, 0.35, 0.72, 1] as const,
  },
  accent: {
    /** Luxury travel pairing on top of Glassmorphism vibrant accents */
    gold: "#D4AF37",
    goldMuted: "rgba(212, 175, 55, 0.55)",
    teal: "#2DD4BF",
  },
} as const;
