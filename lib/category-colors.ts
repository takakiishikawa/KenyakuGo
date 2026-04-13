// カテゴリ → [背景色, テキスト色] のマッピング
const COLORS: Record<string, [string, string]> = {
  "食費":              ["#1B4D30", "#FFFFFF"],
  "食費（外食）":      ["#1B4D30", "#FFFFFF"],
  "食費（自炊）":      ["#134E4A", "#FFFFFF"],
  "家賃":              ["#1E3A5F", "#FFFFFF"],
  "固定費":            ["#1E3A5F", "#FFFFFF"],
  "マッサージ":        ["#3B1F5E", "#FFFFFF"],
  "マッサージ・スパ":  ["#3B1F5E", "#FFFFFF"],
  "スパ":              ["#3B1F5E", "#FFFFFF"],
  "エンタメ":          ["#7C3700", "#FFFFFF"],
  "ショッピング":      ["#78350F", "#FFFFFF"],
  "EC":                ["#78350F", "#FFFFFF"],
  "通信費":            ["#0C4A6E", "#FFFFFF"],
  "サブスク":          ["#312E81", "#FFFFFF"],
  "カフェ":            ["#92400E", "#FFFFFF"],
  "交通費":            ["#164E63", "#FFFFFF"],
  "医療":              ["#164E63", "#FFFFFF"],
  "医療・薬局":        ["#164E63", "#FFFFFF"],
  "転送":              ["#374151", "#FFFFFF"],
  "引き出し（現金）":  ["#374151", "#FFFFFF"],
  "その他":            ["#7F1D1D", "#FFFFFF"],
};

// 未知カテゴリは名前のハッシュで色を選ぶ
const FALLBACKS: [string, string][] = [
  ["#1B4D30", "#FFFFFF"],
  ["#134E4A", "#FFFFFF"],
  ["#3B1F5E", "#FFFFFF"],
  ["#7C3700", "#FFFFFF"],
  ["#0C4A6E", "#FFFFFF"],
  ["#312E81", "#FFFFFF"],
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
