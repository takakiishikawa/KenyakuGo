const COLORS: Record<string, [string, string]> = {
  外食: ["#dcfce7", "#15803d"],
  自炊: ["#ccfbf1", "#0f766e"],
  カフェ: ["#fef9c3", "#a16207"],
  家賃: ["#dbeafe", "#1d4ed8"],
  通信: ["#e0f2fe", "#0369a1"],
  サブスク: ["#e0e7ff", "#3730a3"],
  マッサージ: ["#f3e8ff", "#7e22ce"],
  ジム: ["#ede9fe", "#6d28d9"],
  医薬品: ["#fce7f3", "#9d174d"],
  ファッション: ["#fef3c7", "#92400e"],
  EC: ["#ffedd5", "#c2410c"],
  学習: ["#dbeafe", "#1e40af"],
  旅行: ["#cffafe", "#0e7490"],
  エンタメ: ["#fde68a", "#b45309"],
  ガソリン: ["#fee2e2", "#b91c1c"],
  駐車場: ["#e2e8f0", "#475569"],
  日用品: ["#f5f5f4", "#57534e"],
  転送: ["#f1f5f9", "#475569"],
  現金: ["#f1f5f9", "#475569"],
  その他: ["#fee2e2", "#dc2626"],
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

export function getCategoryColors(category: string): {
  bg: string;
  text: string;
} {
  const match = COLORS[category];
  if (match) return { bg: match[0], text: match[1] };
  const fb = FALLBACKS[hashStr(category) % FALLBACKS.length];
  return { bg: fb[0], text: fb[1] };
}
