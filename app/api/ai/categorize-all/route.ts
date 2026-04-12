import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 300;

export async function POST() {
  const db = createDb();

  // 「その他」の取引を全件取得
  const { data: uncategorized, error } = await db
    .from("transactions")
    .select("id, store, amount")
    .eq("category", "その他");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const txs = uncategorized ?? [];
  if (txs.length === 0) return NextResponse.json({ updated: 0, total: 0 });

  // 既存カテゴリ一覧
  const { data: categoryRows } = await db.from("categories").select("name").order("created_at");
  const existingCategories = (categoryRows ?? []).map((r) => r.name);

  // すでに分類済みの店名→カテゴリ マップを構築（その他以外）
  const { data: classified } = await db
    .from("transactions")
    .select("store, category")
    .neq("category", "その他");

  const storeMap: Record<string, string> = {};
  for (const tx of classified ?? []) {
    if (tx.store && !storeMap[tx.store]) {
      storeMap[tx.store] = tx.category;
    }
  }

  // ユニーク店名のうち、未知のものだけAPIで分類
  const unknownStores = [...new Set(
    txs
      .map((t) => t.store?.trim())
      .filter((s): s is string => !!s && !storeMap[s] && !/chuyen|transfer|remit|remittance/i.test(s))
  )];

  for (const store of unknownStores) {
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `以下の店名に最も適切なカテゴリを1つ返してください。
店名: ${store}
既存カテゴリ: ${existingCategories.join(", ")}

既存カテゴリのどれかが適切であればそれを使ってください。
どれも合わない場合は新しいカテゴリ名を日本語で作ってください（簡潔に）。
{"category": "カテゴリ名"} のJSONのみ返してください。`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") continue;

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const category = JSON.parse(jsonMatch[0]).category?.trim();
      if (!category) continue;

      if (!existingCategories.includes(category)) {
        await db.from("categories").insert({ name: category });
        existingCategories.push(category);
      }

      storeMap[store] = category;
    } catch {
      // スキップ
    }
  }

  // 転送パターン・家賃パターンのストアも storeMap に追加
  for (const tx of txs) {
    const store = tx.store?.trim() ?? "";
    const amount = (tx as { store: string; amount?: number }).amount ?? 0;
    if (!store || /chuyen|transfer|remit|remittance/i.test(store)) {
      // 9,000,000 または 8,000,000 VND の定期転送は家賃
      const isRent = amount === 9000000 || amount === 8000000;
      const cat = isRent ? "家賃" : "転送";
      if (!existingCategories.includes(cat)) {
        await db.from("categories").insert({ name: cat });
        existingCategories.push(cat);
      }
      if (!storeMap[store]) storeMap[store] = cat;
    }
  }

  // 一括更新：storeMap を使って取引を更新
  let updated = 0;
  for (const tx of txs) {
    const store = tx.store?.trim() ?? "";
    const category = storeMap[store] ?? "その他";
    if (category === "その他") continue;

    const { error: updateErr } = await db
      .from("transactions")
      .update({ category })
      .eq("id", tx.id);

    if (!updateErr) updated++;
  }

  return NextResponse.json({
    updated,
    total: txs.length,
    apiCalls: unknownStores.length,
  });
}
