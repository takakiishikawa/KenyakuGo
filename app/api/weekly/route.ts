import { NextRequest, NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

type PeriodItem = {
  label: string;
  total: number;
  byCategory: Record<string, number>;
};

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const db = createDb();

  const { data: allTxs } = await db
    .from("transactions")
    .select("category, amount, date")
    .order("date");

  const txs = (allTxs ?? []) as Pick<Transaction, "category" | "amount" | "date">[];

  // データのスパンを確認して年タブを表示するか判定
  const dates = txs.map((t) => new Date(t.date));
  const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
  const spanMonths =
    (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
    (maxDate.getMonth() - minDate.getMonth());
  const showYearTab = spanMonths >= 12;

  const groupByPeriod = (
    buckets: { label: string; start: Date; end: Date }[]
  ): PeriodItem[] => {
    return buckets.map(({ label, start, end }) => {
      const bucket = txs.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const byCategory: Record<string, number> = {};
      let total = 0;
      for (const t of bucket) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
        total += t.amount;
      }
      return { label, total, byCategory };
    });
  };

  let periods: PeriodItem[] = [];

  if (period === "week") {
    // 実データのある直近4週を使用
    const weekStartMap = new Map<string, Date>();
    for (const tx of txs) {
      const ws = getWeekStart(new Date(tx.date));
      const key = ws.toISOString().slice(0, 10);
      if (!weekStartMap.has(key)) weekStartMap.set(key, ws);
    }
    const weekStarts = [...weekStartMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4)
      .map(([, d]) => d);

    const buckets = weekStarts.map((ws) => {
      const end = getWeekEnd(ws);
      const m = ws.getMonth() + 1;
      const d = ws.getDate();
      return { label: `${m}/${d}週`, start: ws, end };
    });
    periods = groupByPeriod(buckets);
  } else if (period === "month") {
    // 全月
    const monthSet = new Set(txs.map((t) => t.date.slice(0, 7)));
    const months = [...monthSet].sort();
    const buckets = months.map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { label: `${y}年${m}月`, start, end };
    });
    periods = groupByPeriod(buckets);
  } else if (period === "year") {
    // 全年
    const yearSet = new Set(txs.map((t) => t.date.slice(0, 4)));
    const years = [...yearSet].sort();
    const buckets = years.map((y) => {
      const yn = Number(y);
      const start = new Date(yn, 0, 1);
      const end = new Date(yn, 11, 31, 23, 59, 59, 999);
      return { label: `${y}年`, start, end };
    });
    periods = groupByPeriod(buckets);
  }

  // 全カテゴリ集計（合計上位5カテゴリをグラフに表示）
  const categoryTotals: Record<string, number> = {};
  for (const p of periods) {
    for (const [cat, amt] of Object.entries(p.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amt;
    }
  }
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  const currentPeriod = periods[periods.length - 1];
  const prevPeriod = periods[periods.length - 2];
  const diff = (currentPeriod?.total ?? 0) - (prevPeriod?.total ?? 0);
  const topCategory =
    Object.entries(currentPeriod?.byCategory ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  return NextResponse.json({
    periods,
    topCategories,
    diff,
    topCategory,
    currentTotal: currentPeriod?.total ?? 0,
    showYearTab,
  });
}
