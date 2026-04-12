import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDb, type Transaction } from "@/lib/supabase/db";
import { fetchVietcombankEmails } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";

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

    let emails: { id: string; body: string }[] = [];
    try {
      emails = await fetchVietcombankEmails(accessToken!);
    } catch (e) {
      console.error("[sync] Gmail fetch error:", e);
      return NextResponse.json(
        { error: `Gmail API error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 502 }
      );
    }

    const db = createDb();
    let synced = 0;
    let insertError: string | null = null;

    for (const email of emails) {
      const parsed = parseVietcombankEmail(email.body);
      if (!parsed.isValid) continue;

      const { data: existing, error: findError } = await db
        .from("transactions")
        .select("id")
        .eq("gmail_id", email.id)
        .maybeSingle();

      if (findError) {
        console.error("[sync] findUnique error:", findError);
        insertError = findError.message;
        break;
      }
      if (existing) continue;

      const { error: err } = await db.from("transactions").insert({
        id: crypto.randomUUID(),
        gmail_id: email.id,
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

    // 未分類を AI 自動カテゴリ分類
    const { data: uncategorized, error: fetchError } = await db
      .from("transactions")
      .select("id, store")
      .eq("category", "その他");

    if (fetchError) {
      console.error("[sync] fetchUncategorized error:", fetchError);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    for (const tx of (uncategorized ?? []) as Pick<Transaction, "id" | "store">[]) {
      try {
        const res = await fetch(`${siteUrl}/api/ai/categorize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store: tx.store }),
        });
        if (res.ok) {
          const { category } = await res.json();
          await db.from("transactions").update({ category }).eq("id", tx.id);
        }
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
