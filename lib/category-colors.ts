const COLORS: Record<string, [string, string]> = {
  "食費":              ["#dcfce7", "#15803d"],
  "食費（外食）":      ["#dcfce7", "#15803d"],
  "食費（自炊）":      ["#ccfbf1", "#0f766e"],
  "家賃":              ["#dbeafe", "#1d4ed8"],
  "固定費":            ["#dbeafe", "#1d4ed8"],
  "マッサージ":        ["#f3e8ff", "#7e22ce"],
  "マッサージ・スパ":  ["#f3e8ff", "#7e22ce"],
  "スパ":              ["#f3e8ff", "#7e22ce"],
  "エンタメ":          ["#ffedd5", "#c2410c"],
  "ショッピング":      ["#fef3c7", "#92400e"],
  "EC":                ["#fef3c7", "#92400e"],
  "通信費":            ["#e0f2fe", "#0369a1"],
  "サブスク":          ["#e0e7ff", "#3730a3"],
  "カフェ":            ["#fef9c3", "#a16207"],
  "交通費":            ["#cffafe", "#0e7490"],
  "医療":              ["#fce7f3", "#9d174d"],
  "医療・薬局":        ["#fce7f3", "#9d174d"],
  "転送":              ["#f1f5f9", "#475569"],
  "引き出し（現金）":  ["#f1f5f9", "#475569"],
  "その他":            ["#fee2e2", "#dc2626"],
};

const FALLBACKS: [string, string][] = [
  ["#dcfce7", "#15803d"],
  ["#dbeafe", "#1d4ed8"],
  ["#f3e8ff", "#7e22ce"],
  ["#ffedd5", "#c2410c"],
  ["#e0f2fe", "#0369a1"],
  ["#e0e7ff", "#3730a3"],
  ["#cffafe", "#0e7490"],
  ["#fce7f3", "#9d174d"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getCategoryColors(category: string): { bg: string; text: string } {
  const match = COLORS[category];
  if (match) return { bg: match[0], text: match[1] };
  const fb = FALLBACKS[hashStr(category) % FALLBACKS.length];
  return { bg: fb[0], text: fb[1] };
}
