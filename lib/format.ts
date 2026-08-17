// VNDは桁数が多くなりがちなので(0が並びすぎて読みにくい)、千・百万単位の
// コンパクト表記にする。日本円(formatJPY)はこれまで通り実額をそのまま表示する。
// K(千)は小数なしの整数、M(百万)以上は小数点第1位まで(末尾が.0なら省略)。
// 例: 580,600 → "581K"、1,700,000 → "1.7M"、2,000,000 → "2M"。
function compactMagnitude(abs: number): string {
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(abs / 1_000)}K`;
  }
  return String(Math.round(abs));
}

export function formatVND(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  return `${sign}${compactMagnitude(abs)} ₫`;
}

export function formatJPY(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}¥${digits}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDateWithYear(date: string | Date): string {
  const d = new Date(date);
  const dow = DOW[d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${dow}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
