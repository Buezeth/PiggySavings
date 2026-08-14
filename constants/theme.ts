/**
 * Central design theme token values matching definitions in global.css.
 */
export const colors = {
  primary: "#EE6A3B",
  primaryDark: "#D45427",
  primaryLight: "#F48A64",

  bgApp: "#FAF4F0",
  bgCard: "#FFFFFF",
  bgAccent: "#E35D31",

  textMain: "#331C14",
  textMuted: "#8C7B75",
  textBrand: "#A83B1B",

  gold: "#F5B800",
  coralSubtle: "#FDF3EF",
  borderCard: "#F3ECE7",

  // Visual state & trend accents
  emerald: "#10B981",
  emeraldSubtle: "#ECFDF5",
  trendUp: "#10B981",
  trendUpBg: "#ECFDF5",
  mutedTrack: "#EAE0DA",
  white: "#FFFFFF",

  // Translucent overlays
  whiteOverlay10: "rgba(255, 255, 255, 0.1)",
  whiteOverlay20: "rgba(255, 255, 255, 0.2)",
  whiteOverlay30: "rgba(255, 255, 255, 0.3)",
  whiteOverlay40: "rgba(255, 255, 255, 0.4)",
  whiteOverlay80: "rgba(255, 255, 255, 0.8)",
} as const;

export type ThemeColors = typeof colors;

export default colors;