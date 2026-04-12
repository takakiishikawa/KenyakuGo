import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchVietcombankEmails } from "@/lib/gmail";
import { parseVietcombankEmail } from "@/lib/parser";
import { prisma } from "@/lib/prisma";

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

    let synced = 0;
    for (const email of emails) {
      const parsed = parseVietcombankEmail(email.body);
      if (!parsed.isValid) continue;

      const existing = await prisma.transaction.findUnique({
        where: { gmailId: email.id },
      });
      if (existing) continue;

      await prisma.transaction.create({
        data: {
          gmailId: email.id,
          store: parsed.store,
          amount: parsed.amount,
          date: parsed.date,
          category: "その他",
          rawText: email.body,
        },
      });
      synced++;
    }

    // 未分類をAI自動カテゴリ分類
    const uncategorized = await prisma.transaction.findMany({
      where: { category: "その他" },
    });

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    for (const tx of uncategorized) {
      try {
        const res = await fetch(`${siteUrl}/api/ai/categorize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store: tx.store }),
        });
        if (res.ok) {
          const { category } = await res.json();
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { category },
          });
        }
      } catch {
        // AI分類失敗時はスキップ
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
