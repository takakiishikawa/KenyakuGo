import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";
import { listVietcombankMessageIds, fetchEmailBody } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";
import { convertToVND } from "@/lib/exchange";

export const maxDuration = 300;

// Gmail 全期間の再取り込み用エンドポイント。
// 1 リクエストあたり BATCH 件処理して remaining を返す。
// クライアント側で remaining=0 になるまでループ呼び出しする想定。
const BATCH_PER_REQUEST = 200;

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "No session — please log in" },
        { status: 401 },
      );
    }

    let accessToken = session.provider_token;
    if (!accessToken) {
      // セッション更新後に provider_token が消えるケースは DB のリフレッシュトークンで再取得
      const dbForToken = createDb(session.access_token);
      const { data: settingsData } = await dbForToken
        .from("settings")
        .select("google_refresh_token")
        .eq("id", "singleton")
        .maybeSingle();
      const refreshToken = (
        settingsData as Pick<Settings, "google_refresh_token"> | null
      )?.google_refresh_token;
      if (!refreshToken) {
        return NextResponse.json(
          { error: "No refresh token — please log in again" },
          { status: 401 },
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
          { error: "Failed to refresh Google token" },
          { status: 401 },
        );
      }
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    }

    const db = createDb(session.access_token);

    // 1. 旧 parser 時代の「外貨メール解析失敗」のプレースホルダ行を一掃。
    //    これらは store="" amount=0 で gmail_id を握っていて、再 sync をブロックしてしまう。
    const { count: deleted } = await db
      .from("transactions")
      .delete({ count: "exact" })
      .eq("store", "")
      .eq("amount", 0);

    // 2. Gmail から全期間のメッセージ ID を取得（ページングは listVietcombankMessageIds 内で対応済み）
    const allIds = await listVietcombankMessageIds(accessToken!);

    // 3. 既存 gmail_id と「店舗→既知カテゴリ」マップを構築
    const existingIds = new Set<string>();
    const storeCategory = new Map<string, string>();
    const PAGE = 1000;
    let page = 0;
    while (true) {
      const { data: pageRows } = await db
        .from("transactions")
        .select("gmail_id, store, category")
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (!pageRows || pageRows.length === 0) break;
      for (const row of pageRows) {
        if (row.gmail_id) existingIds.add(row.gmail_id as string);
        const s = (row.store as string)?.trim();
        const c = row.category as string;
        if (s && c && c !== "その他") storeCategory.set(s, c);
      }
      if (pageRows.length < PAGE) break;
      page++;
    }

    // 4. 不足分を抽出して BATCH_PER_REQUEST だけ処理
    const allMissing = allIds.filter((id) => !existingIds.has(id));
    const newIds = allMissing.slice(0, BATCH_PER_REQUEST);
    const remaining = Math.max(0, allMissing.length - BATCH_PER_REQUEST);

    let synced = 0;
    let skippedConvert = 0;
    let skippedParse = 0;

    for (const id of newIds) {
      let body: string | null = null;
      try {
        body = await fetchEmailBody(accessToken!, id);
      } catch {
        continue;
      }
      if (!body) continue;

      const parsed = parseVietcombankEmail(body);
      if (!parsed.isValid) {
        // backfill ではプレースホルダを作らず単純にスキップ
        skippedParse++;
        continue;
      }

      let vndAmount: number;
      try {
        vndAmount = await convertToVND(parsed.amount, parsed.currency);
      } catch (e) {
        console.error(
          `[backfill] currency conversion failed for ${id} (${parsed.currency}):`,
          e,
        );
        skippedConvert++;
        continue;
      }

      const knownCategory = storeCategory.get(parsed.store.trim());
      const { error } = await db.from("transactions").insert({
        id: crypto.randomUUID(),
        gmail_id: id,
        store: parsed.store,
        amount: vndAmount,
        date: parsed.date.toISOString(),
        category: knownCategory ?? "その他",
      } satisfies Omit<Transaction, "created_at">);

      if (error) {
        // 重複キーは既に取り込まれた行とぶつかっただけなのでスキップ
        if (error.code === "23505") continue;
        console.error("[backfill] insert error:", error);
        continue;
      }
      synced++;
    }

    return NextResponse.json({
      deleted: deleted ?? 0,
      synced,
      skippedParse,
      skippedConvert,
      remaining,
      totalGmail: allIds.length,
      totalMissing: allMissing.length,
    });
  } catch (e) {
    console.error("[backfill] unexpected:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
