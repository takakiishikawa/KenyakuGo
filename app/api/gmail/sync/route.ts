import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDb, type Transaction } from "@/lib/supabase/db";
import { listVietcombankMessageIds, fetchEmailBody } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";

export const maxDuration = 300; // 5分 (Vercel/Next.js route timeout)

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "No session — please log in" }, { status: 401 });
    }
    let accessToken = session.provider_token;

    if (!accessToken) {
      // セッション更新後に provider_token が消えるため、DB のリフレッシュトークンで再取得
      const db = createDb();
      const { data: settings } = await db
        .from("settings")
        .select("google_refresh_token")
        .eq("id", "singleton")
        .maybeSingle();

      const refreshToken = (settings as { google_refresh_token?: string } | null)
        ?.google_refresh_token;

      if (!refreshToken) {
        return NextResponse.json(
          { error: "No provider_token — please log in again" },
          { status: 401 }
        );
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
        return NextResponse.json(
          { error: "Failed to refresh Google token — please log in again" },
          { status: 401 }
        );
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    }

    // 1. Gmail から全メッセージIDを取得
    let allIds: string[] = [];
    try {
      allIds = await listVietcombankMessageIds(accessToken!);
    } catch (e) {
      console.error("[sync] Gmail fetch error:", e);
      return NextResponse.json(
        { error: `Gmail API error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 502 }
      );
    }

    const db = createDb();

    // 2. DB に既存の gmail_id を取得してセットに
    const { data: existingRows } = await db
      .from("transactions")
      .select("gmail_id");
    const existingIds = new Set((existingRows ?? []).map((r) => r.gmail_id as string));

    // 3. 新規IDのみ抽出
    const newIds = allIds.filter((id) => !existingIds.has(id));

    let synced = 0;
    let insertError: string | null = null;

    // 4. 新規IDのみ本文を取得してパース・保存
    for (const id of newIds) {
      let body: string | null = null;
      try {
        body = await fetchEmailBody(accessToken!, id);
      } catch (e) {
        console.error("[sync] fetchEmailBody error:", e);
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

      if (err) {
        console.error("[sync] Insert error:", err);
        insertError = err.message;
        break;
      }
      synced++;
    }

    if (insertError) {
      return NextResponse.json({ error: `DB error: ${insertError}`, synced }, { status: 500 });
    }

    // 未分類を AI 自動カテゴリ分類（同じ店名は過去の分類を再利用）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    if (synced > 0) {
      try {
        await fetch(`${siteUrl}/api/ai/categorize-all`, { method: "POST" });
      } catch {
        // AI 分類失敗時はスキップ
      }
    }

    return NextResponse.json({ synced });
  } catch (e) {
    console.error("[sync] Unexpected error:", e);
    return NextResponse.json(
      { error: `Unexpected error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
