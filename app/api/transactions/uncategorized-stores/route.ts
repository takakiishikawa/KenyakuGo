import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const db = createDb();

  const { data, error } = await db
    .from("transactions")
    .select("store")
    .eq("category", "その他")
    .eq("reviewed", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countMap: Record<string, number> = {};
  for (const tx of data ?? []) {
    const s = tx.store?.trim();
    if (s) countMap[s] = (countMap[s] ?? 0) + 1;
  }

  // 1件以上、頻度順
  const stores = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .map(([store, count]) => ({ store, count }));

  if (stores.length === 0) return NextResponse.json([]);

  const { data: catRows } = await db.from("categories").select("name").order("created_at");
  const categories = (catRows ?? []).map((r) => r.name);

  // 1回のAPIコールで全店名を一括提案（カテゴリ＋推測理由）
  const storeList = stores.map((s, i) => `${i + 1}. ${s.store}`).join("\n");
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `ベトナム・ホーチミン在住の日本人のクレジットカード明細の店名リストです。
各店名に対して、最適なカテゴリと、その店が何をしているかの簡潔な推測（日本語・20字以内）を返してください。

既存カテゴリ: ${categories.join(", ")}

店名リスト:
${storeList}

既存カテゴリが適切であればそれを使い、合わない場合は新しいカテゴリ名（日本語・簡潔）を作ってください。
以下のJSON配列のみ返してください:
[{"store": "店名", "category": "カテゴリ名", "hint": "推測（例：フードデリバリーアプリ）"}]`,
      },
    ],
  });

  let suggestions: { store: string; category: string; hint: string }[] = [];
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) suggestions = JSON.parse(match[0]);
  } catch {
    // パース失敗時は提案なし
  }

  const suggestionMap = Object.fromEntries(
    suggestions.map((s) => [s.store, { category: s.category, hint: s.hint }])
  );

  return NextResponse.json(
    stores.map((s) => ({
      store: s.store,
      count: s.count,
      suggested: suggestionMap[s.store]?.category ?? null,
      hint: suggestionMap[s.store]?.hint ?? null,
    }))
  );
}
