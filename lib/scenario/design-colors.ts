// Claude Design (kenyakugo-ui-redesign/project/PiggyBank.dc.html) の配色をそのまま
// リテラル値で持つ。既存アプリのCSS変数(--color-*)経由だと実機でコントラストが
// 不足するケースがあったため、Simulation関連UIはデザインの値を直接使う。
export const DC = {
  cream: "#FAF5EE",
  cardBg: "#FFFFFF",
  cardBorder: "#EFE6D8",
  track: "#F1E9DC",
  trackAlt: "#F5EFE4",
  headerBg: "#FBF7F1",
  rowAltBg: "#FFFDF9",
  textPrimary: "#2B2620",
  textSecondary: "#5B5346",
  textSubtle: "#8A8172",
  textFaint: "#B0A692",
  primary: "#BE5B85",
  primaryHover: "#8C3A5E",
  primaryTint: "#F7E1EA",
  danger: "#C0392B",
  success: "#16A34A",
  warning: "#B8720B",
} as const;
