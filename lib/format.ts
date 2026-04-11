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
