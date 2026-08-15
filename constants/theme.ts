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
  goldLight: "#FCD34D",
  goldDark: "#D97706",
  goldSubtle: "#FEF3C7",
  goldBorder: "#FDE68A",
  goldBorderDark: "#F59E0B",
  coralSubtle: "#FDF3EF",
  borderCard: "#F3ECE7",
  borderCardDark: "#E2D5CC",

  // Visual state & trend accents
  emerald: "#10B981",
  emeraldLight: "#34D399",
  emeraldDark: "#059669",
  emeraldSubtle: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
  emeraldBorderDark: "#6EE7B7",

  rose: "#F43F5E",
  roseLight: "#FB7185",
  roseDark: "#E11D48",
  roseSubtle: "#FFF1F2",
  roseBorder: "#FECDD3",
  roseBorderDark: "#FDA4AF",

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