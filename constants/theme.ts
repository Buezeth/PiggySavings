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

  // Visual state accents
  emerald: "#10B981",
  mutedTrack: "#EAE0DA",
  white: "#FFFFFF",
} as const;

export type ThemeColors = typeof colors;

export default colors;
