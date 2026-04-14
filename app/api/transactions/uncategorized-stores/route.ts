import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const db = createDb();

  const { data, error } = await db
    .from("transactions")
    .select("store, amount")
    .eq("category", "その他")
    .eq("reviewed", false)
    .gt("amount", 0)
    .limit(10000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countMap: Record<string, number> = {};
  const amountMap: Record<string, number> = {};
  for (const tx of data ?? []) {
    const s = tx.store?.trim();
    if (s) {
      countMap[s] = (countMap[s] ?? 0) + 1;
      amountMap[s] = (amountMap[s] ?? 0) + tx.amount;
    }
  }

  // 1件以上、頻度順
  const stores = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .map(([store, count]) => ({ store, count, totalAmount: amountMap[store] ?? 0 }));

  if (stores.length === 0) return NextResponse.json([]);

  const { data: catRows } = await db.from("categories").select("name").order("created_at");
  const categories = (catRows ?? []).map((r) => r.name);

  // 1回のAPIコールで全店名を一括提案（カテゴリ・推測理由・明白性）
  const storeList = stores.map((s, i) => `${i + 1}. ${s.store}`).join("\n");
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `ベトナム・ホーチミン在住の日本人のクレジットカード明細の店名リストです。
各店名に対して、カテゴリ・推測理由・明白性を返してください。

既存カテゴリ: ${categories.join(", ")}

店名リスト:
${storeList}

ルール:
- 既存カテゴリが適切であればそれを使い、合わない場合は新しいカテゴリ名（日本語・簡潔）を提案
- "obvious": true → 店名から業種がほぼ確実に判断できる（例: MINISTOP→コンビニ、GRAB→フードデリバリー、McDonald's→ファーストフード、CIRCLE K→コンビニ）
- "obvious": false → 判断が難しい・個人名・略称など
- "hint": 店が何をしているかの簡潔な推測（日本語・20字以内）

以下のJSON配列のみ返してください（必ずobviousフィールドを含めること）:
[{"store": "店名", "category": "カテゴリ名", "hint": "推測", "obvious": true}]`,
      },
    ],
  });

  let suggestions: { store: string; category: string; hint: string; obvious: boolean }[] = [];
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) suggestions = JSON.parse(match[0]);
  } catch {
    // パース失敗時は提案なし
  }

  const suggestionMap = Object.fromEntries(
    suggestions.map((s) => [s.store, { category: s.category, hint: s.hint, obvious: s.obvious }])
  );

  // obvious=true の店舗は自動でカテゴリ適用
  const obviousStores = stores.filter((s) => suggestionMap[s.store]?.obvious === true);
  const manualStores = stores.filter((s) => suggestionMap[s.store]?.obvious !== true);

  if (obviousStores.length > 0) {
    const existingCatSet = new Set(categories);

    for (const s of obviousStores) {
      const suggestion = suggestionMap[s.store];
      if (!suggestion) continue;
      const { category } = suggestion;

      // カテゴリが存在しなければ作成
      if (!existingCatSet.has(category)) {
        await db.from("categories").insert({ name: category }).select().maybeSingle();
        existingCatSet.add(category);
      }

      // 全件を自動分類・reviewed=true
      await db
        .from("transactions")
        .update({ category, reviewed: true })
        .eq("store", s.store)
        .eq("category", "その他");
    }
  }

  return NextResponse.json(
    manualStores.map((s) => ({
      store: s.store,
      count: s.count,
      totalAmount: s.totalAmount,
      suggested: suggestionMap[s.store]?.category ?? null,
      hint: suggestionMap[s.store]?.hint ?? null,
    }))
  );
}
