// カテゴリ → [背景色, テキスト色] のマッピング
const COLORS: Record<string, [string, string]> = {
  "食費":              ["#1B3D2A", "#74C69D"],
  "食費（外食）":      ["#1B3D2A", "#74C69D"],
  "食費（自炊）":      ["#134E4A", "#2DD4BF"],
  "家賃":              ["#1E3A5F", "#60A5FA"],
  "固定費":            ["#1E3A5F", "#60A5FA"],
  "マッサージ":        ["#3B1F5E", "#C084FC"],
  "マッサージ・スパ":  ["#3B1F5E", "#C084FC"],
  "スパ":              ["#3B1F5E", "#C084FC"],
  "エンタメ":          ["#4A2C0A", "#FB923C"],
  "ショッピング":      ["#451A03", "#FBBF24"],
  "EC":                ["#451A03", "#FBBF24"],
  "通信費":            ["#0C4A6E", "#38BDF8"],
  "サブスク":          ["#1E1B4B", "#818CF8"],
  "カフェ":            ["#2C1810", "#F59E0B"],
  "交通費":            ["#1A2936", "#7DD3FC"],
  "医療":              ["#1A2936", "#7DD3FC"],
  "医療・薬局":        ["#1A2936", "#7DD3FC"],
  "転送":              ["#1F2937", "#9CA3AF"],
  "引き出し（現金）":  ["#1F2937", "#9CA3AF"],
  "その他":            ["#450A0A", "#F87171"],
};

// 未知カテゴリは名前のハッシュで色を選ぶ
const FALLBACKS: [string, string][] = [
  ["#1B3D2A", "#74C69D"],
  ["#134E4A", "#2DD4BF"],
  ["#3B1F5E", "#C084FC"],
  ["#4A2C0A", "#FB923C"],
  ["#0C4A6E", "#38BDF8"],
  ["#1E1B4B", "#818CF8"],
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
