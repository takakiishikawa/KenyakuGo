export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " ₫";
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateWithYear(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
