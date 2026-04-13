import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const db = createDb();

  // 「その他」の取引を店名でグループ化してカウント
  const { data, error } = await db
    .from("transactions")
    .select("store")
    .eq("category", "その他");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countMap: Record<string, number> = {};
  for (const tx of data ?? []) {
    const s = tx.store?.trim();
    if (s) countMap[s] = (countMap[s] ?? 0) + 1;
  }

  // 2回以上出現するものを頻度順で返す
  const stores = Object.entries(countMap)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([store, count]) => ({ store, count }));

  if (stores.length === 0) return NextResponse.json([]);

  // 既存カテゴリ一覧
  const { data: catRows } = await db.from("categories").select("name").order("created_at");
  const categories = (catRows ?? []).map((r) => r.name);

  // 1回のAPIコールで全店名を一括提案
  const storeList = stores.map((s, i) => `${i + 1}. ${s.store}`).join("\n");
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `以下の店名それぞれに最も適切なカテゴリを提案してください。
既存カテゴリ: ${categories.join(", ")}

店名リスト:
${storeList}

既存カテゴリのどれかが適切であればそれを使い、合わない場合は新しいカテゴリ名（日本語・簡潔に）を作ってください。
以下のJSON配列のみ返してください:
[{"store": "店名", "category": "カテゴリ名"}]`,
      },
    ],
  });

  let suggestions: { store: string; category: string }[] = [];
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) suggestions = JSON.parse(match[0]);
  } catch {
    // パース失敗時は提案なし
  }

  const suggestionMap = Object.fromEntries(suggestions.map((s) => [s.store, s.category]));

  return NextResponse.json(
    stores.map((s) => ({
      store: s.store,
      count: s.count,
      suggested: suggestionMap[s.store] ?? null,
    }))
  );
}
