// VNDは桁数が多くなりがちなので(0が並びすぎて読みにくい)、千・百万単位の
// コンパクト表記(例: 1.235.678 ₫ → 1,2M ₫)にする。日本円(formatJPY)は
// これまで通り実額をそのまま表示する。
export function formatVND(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  // "en-US" だとK/M/Bのアルファベット表記になる("de-DE"だとTsd./Mio.になってしまう)。
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(abs);
  return `${sign}${compact} ₫`;
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
