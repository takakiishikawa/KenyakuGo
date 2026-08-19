import { formatVND, formatJPY } from "@/lib/format";
import type { DisplayCurrency } from "@/components/currency-switch";

// 固定レート。以前はSimulation側だけ為替APIのライブレートを使っていたため、
// 同じ円/VND金額でもDashboard/Transactions/Budgetとページごとに違う数字に
// 変換される・日々レートが変わって表示がブレる、という不具合があった。
// 金額の変換は全画面この1つの定数だけを使う(ライブ為替取得はしない)。
export const VND_PER_JPY = 165;

export function makeFormatAmount(displayCurrency: DisplayCurrency) {
  return (vndAmount: number) =>
    displayCurrency === "VND" ? formatVND(vndAmount) : formatJPY(vndAmount / VND_PER_JPY);
}

// Budgets are stored in VND internally, but shown and typed in whichever
// currency the display switch is set to — converting on the way in and out.
export function toDisplayAmount(vnd: number, displayCurrency: DisplayCurrency): number {
  return displayCurrency === "VND" ? Math.round(vnd) : Math.round(vnd / VND_PER_JPY);
}

export function toVndAmount(displayAmount: number, displayCurrency: DisplayCurrency): number {
  return displayCurrency === "VND" ? displayAmount : Math.round(displayAmount * VND_PER_JPY);
}

export function withThousands(v: string, displayCurrency: DisplayCurrency): string {
  const sep = displayCurrency === "VND" ? "." : ",";
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
