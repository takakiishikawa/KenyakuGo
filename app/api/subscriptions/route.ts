import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import {
  refreshSubscriptions,
  loadDisplayRows,
  type SubscriptionRow,
} from "@/lib/subscriptions/refresh";

export const maxDuration = 60;

export interface SubscriptionItem {
  store: string;
  category: string;
  amount: number;
  lastChargedAt: string;
  judgment: "sub" | "not_sub" | "unknown";
  reasoning: string | null;
  isActive: boolean;
  userLocked: boolean;
}

function toItem(row: SubscriptionRow): SubscriptionItem {
  return {
    store: row.store,
    category: row.category,
    amount: row.amount,
    lastChargedAt: row.last_charged_at,
    judgment: row.judgment,
    reasoning: row.reasoning,
    isActive: row.is_active,
    userLocked: row.user_locked,
  };
}

// 表示専用。既存テーブルから読むだけ（cron が定期 refresh する）
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  try {
    const rows = await loadDisplayRows(db);
    return NextResponse.json(rows.map(toItem));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}

// 「AIで再判定」ボタンから呼ばれる。直近30日のトランザクションを再評価
export async function POST() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  try {
    const rows = await refreshSubscriptions(db);
    return NextResponse.json(rows.map(toItem));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
