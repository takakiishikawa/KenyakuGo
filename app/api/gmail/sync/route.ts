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
    if (!session.provider_token) {
      return NextResponse.json(
        { error: "No provider_token — please log in again" },
        { status: 401 }
      );
    }

    let emails: { id: string; body: string }[] = [];
    try {
      emails = await fetchVietcombankEmails(session.provider_token);
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
        raw_text: email.body,
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
