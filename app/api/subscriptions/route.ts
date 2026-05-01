import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

export interface SubscriptionItem {
  store: string;
  category: string;
  amount: number;
  lastChargedAt: string;
  firstChargedAt: string;
  monthsActive: number;
  chargeCount: number;
  isActive: boolean;
}

// サブスク自動検出のしきい値
const ACTIVE_THRESHOLD_DAYS = 45; // 直近45日以内に課金 = アクティブ
const MIN_DISTINCT_MONTHS = 2; // 2ヶ月以上の課金があれば候補
const MAX_AVG_PER_MONTH = 2; // 月あたり平均2件以下（多すぎる店舗は外食など除外）
const MAX_AMOUNT_CV = 0.4; // 金額のばらつき（標準偏差/平均）40%以内
// 明らかに「使った」ではない移動系カテゴリ
const EXCLUDED_CATEGORIES = ["転送", "現金"];

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("transactions")
    .select("store, category, amount, date")
    .gt("amount", 0)
    .order("date", { ascending: false })
    .limit(20000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Tx = { store: string; category: string; amount: number; date: string };
  const txs = (data ?? []) as Tx[];

  const grouped: Record<
    string,
    { category: string; amounts: number[]; dates: string[] }
  > = {};
  for (const tx of txs) {
    if (!tx.store) continue;
    if (EXCLUDED_CATEGORIES.includes(tx.category)) continue;
    if (!grouped[tx.store]) {
      grouped[tx.store] = { category: tx.category, amounts: [], dates: [] };
    }
    grouped[tx.store].amounts.push(tx.amount);
    grouped[tx.store].dates.push(tx.date);
  }

  const now = new Date();

  const subscriptions: SubscriptionItem[] = [];
  for (const [store, { category, amounts, dates }] of Object.entries(grouped)) {
    const months = new Set(dates.map((d) => d.slice(0, 7)));
    if (months.size < MIN_DISTINCT_MONTHS) continue;

    const avgPerMonth = amounts.length / months.size;
    if (avgPerMonth > MAX_AVG_PER_MONTH) continue;

    // 金額のばらつきチェック（CV: coefficient of variation）
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance =
      amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv > MAX_AMOUNT_CV) continue;

    const lastDate = new Date(dates[0]);
    const daysSinceLast =
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    subscriptions.push({
      store,
      category,
      amount: amounts[0],
      lastChargedAt: dates[0],
      firstChargedAt: dates[dates.length - 1],
      monthsActive: months.size,
      chargeCount: amounts.length,
      isActive: daysSinceLast <= ACTIVE_THRESHOLD_DAYS,
    });
  }

  subscriptions.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.amount - a.amount;
  });

  return NextResponse.json(subscriptions);
}
