import { NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";
import { listVietcombankMessageIds, fetchEmailBody } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";

export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を付与する
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createDb();

  // DB に保存されたリフレッシュトークンで Gmail アクセストークンを取得
  const { data: settings } = await db
    .from("settings")
    .select("google_refresh_token")
    .eq("id", "singleton")
    .maybeSingle();

  const refreshToken = (settings as { google_refresh_token?: string } | null)
    ?.google_refresh_token;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token stored" }, { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Failed to refresh Google token" }, { status: 502 });
  }

  const { access_token: accessToken } = await tokenRes.json();

  // Gmail から全メッセージID取得
  let allIds: string[] = [];
  try {
    allIds = await listVietcombankMessageIds(accessToken);
  } catch (e) {
    return NextResponse.json({ error: `Gmail API error: ${String(e)}` }, { status: 502 });
  }

  // DB に既存の gmail_id を取得
  const { data: existingRows } = await db.from("transactions").select("gmail_id");
  const existingIds = new Set((existingRows ?? []).map((r) => r.gmail_id as string));

  const newIds = allIds.filter((id) => !existingIds.has(id)).slice(0, 100);

  let synced = 0;
  for (const id of newIds) {
    let body: string | null = null;
    try {
      body = await fetchEmailBody(accessToken, id);
    } catch {
      continue;
    }
    if (!body) continue;

    const parsed = parseVietcombankEmail(body);
    if (!parsed.isValid) continue;

    const { error: err } = await db.from("transactions").insert({
      id: crypto.randomUUID(),
      gmail_id: id,
      store: parsed.store,
      amount: parsed.amount,
      date: parsed.date.toISOString(),
      category: "その他",
    } satisfies Omit<Transaction, "created_at">);

    if (err) { console.error("[cron/sync] Insert error:", err); break; }
    synced++;
  }

  // 新規取引があれば AI 自動カテゴリ分類
  if (synced > 0) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    try {
      await fetch(`${siteUrl}/api/ai/categorize-all`, { method: "POST" });
    } catch { /* skip */ }
  }

  console.log(`[cron/sync] synced=${synced}`);
  return NextResponse.json({ synced });
}
