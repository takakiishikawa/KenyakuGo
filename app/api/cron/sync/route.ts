import { NextResponse } from "next/server";
import {
  createDbAdmin,
  type Transaction,
  type Settings,
} from "@/lib/supabase/db";
import { listVietcombankMessageIds, fetchEmailBody } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";

export const maxDuration = 60;

export async function GET(req: Request) {
  // 必須 env を fail-fast で検証（無人 cron で設定漏れに気付けるように）
  const cronSecret = process.env.CRON_SECRET;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cronSecret || !googleClientId || !googleClientSecret || !serviceRoleKey) {
    return NextResponse.json(
      {
        error: "Missing required env",
        missing: {
          CRON_SECRET: !cronSecret,
          GOOGLE_CLIENT_ID: !googleClientId,
          GOOGLE_CLIENT_SECRET: !googleClientSecret,
          SUPABASE_SERVICE_ROLE_KEY: !serviceRoleKey,
        },
      },
      { status: 500 },
    );
  }

  // GH Actions cron は Authorization: Bearer <CRON_SECRET> を付与する
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 無人バッチなので RLS bypass の service_role で接続
  const db = createDbAdmin();

  // DB に保存されたリフレッシュトークンで Gmail アクセストークンを取得
  const { data: settings, error: settingsError } = await db
    .from("settings")
    .select("google_refresh_token")
    .eq("id", "singleton")
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      {
        error: "Settings fetch failed",
        code: settingsError.code,
        message: settingsError.message,
        details: settingsError.details,
        hint: settingsError.hint,
      },
      { status: 500 },
    );
  }

  const refreshToken = (
    settings as Pick<Settings, "google_refresh_token"> | null
  )?.google_refresh_token;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error: "No refresh token stored",
        settingsExists: settings !== null,
      },
      { status: 400 },
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "Failed to refresh Google token" },
      { status: 502 },
    );
  }

  const { access_token: accessToken } = await tokenRes.json();

  // Gmail から全メッセージID取得
  let allIds: string[] = [];
  try {
    allIds = await listVietcombankMessageIds(accessToken);
  } catch (e) {
    return NextResponse.json(
      { error: `Gmail API error: ${String(e)}` },
      { status: 502 },
    );
  }

  // DB に既存の gmail_id を取得
  const { data: existingRows } = await db
    .from("transactions")
    .select("gmail_id");
  const existingIds = new Set(
    (existingRows ?? []).map((r) => r.gmail_id as string),
  );

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

    if (err) {
      console.error("[cron/sync] Insert error:", err);
      break;
    }
    synced++;
  }

  // 新規取引があれば AI 自動カテゴリ分類
  if (synced > 0) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    try {
      await fetch(`${siteUrl}/api/ai/categorize-all`, { method: "POST" });
    } catch {
      /* skip */
    }
  }

  console.log(`[cron/sync] synced=${synced}`);
  return NextResponse.json({ synced });
}
