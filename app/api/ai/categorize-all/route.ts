import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST() {
  const db = createDb();

  // 「その他」かつ未レビューの取引を全件取得
  const { data: uncategorized, error } = await db
    .from("transactions")
    .select("id, store, amount")
    .eq("category", "その他")
    .eq("reviewed", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const txs = uncategorized ?? [];
  if (txs.length === 0) return NextResponse.json({ updated: 0, total: 0 });

  // 既存カテゴリ一覧
  const { data: categoryRows } = await db.from("categories").select("name").order("created_at");
  const existingCategories = (categoryRows ?? []).map((r) => r.name);
  const existingCatSet = new Set(existingCategories);

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

  // 転送・家賃パターンをルールベースで先に処理
  for (const tx of txs) {
    const store = tx.store?.trim() ?? "";
    const amount = tx.amount ?? 0;
    if (!store || storeMap[store]) continue;
    if (/chuyen|transfer|remit|remittance/i.test(store)) {
      const isRent = amount === 9000000 || amount === 8000000;
      storeMap[store] = isRent ? "家賃" : "転送";
    }
  }

  // ユニーク未知店名（ルールベース済みを除く）
  const unknownStores = [...new Set(
    txs
      .map((t) => t.store?.trim())
      .filter((s): s is string => !!s && !storeMap[s])
  )];

  // 100店名ずつバッチに分けて並列AI呼び出し
  const BATCH_SIZE = 100;
  const batches: string[][] = [];
  for (let i = 0; i < unknownStores.length; i += BATCH_SIZE) {
    batches.push(unknownStores.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const map: Record<string, string> = {};
      try {
        const storeList = batch.map((s, i) => `${i + 1}. ${s}`).join("\n");
        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: `ベトナム・ホーチミン在住の日本人のクレジットカード明細の店名リストです。
各店名に最も適切なカテゴリを返してください。

既存カテゴリ: ${existingCategories.join(", ")}
店名リスト:
${storeList}

既存カテゴリが適切であればそれを使い、合わない場合は新しいカテゴリ名（日本語・簡潔）を提案してください。
以下のJSON配列のみ返してください（マークダウン不要）:
[{"store": "店名", "category": "カテゴリ名"}]`,
            },
          ],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "[]";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const suggestions: { store: string; category: string }[] = JSON.parse(match[0]);
          for (const s of suggestions) {
            if (s.store && s.category) map[s.store.trim()] = s.category.trim();
          }
        }
      } catch { /* バッチ失敗時はスキップ */ }
      return map;
    })
  );

  // バッチ結果をマージ
  for (const batchMap of batchResults) {
    Object.assign(storeMap, batchMap);
  }

  // 新カテゴリを一括作成
  const newCats = [...new Set(Object.values(storeMap))].filter(
    (c) => c !== "その他" && !existingCatSet.has(c)
  );
  for (const cat of newCats) {
    await db.from("categories").insert({ name: cat });
    existingCatSet.add(cat);
  }

  // カテゴリ別に対象店名をグループ化して一括更新
  const catToStores: Record<string, string[]> = {};
  for (const [store, cat] of Object.entries(storeMap)) {
    if (cat && cat !== "その他") {
      catToStores[cat] = [...(catToStores[cat] ?? []), store];
    }
  }

  let updated = 0;
  for (const [category, stores] of Object.entries(catToStores)) {
    const { error: updateErr } = await db
      .from("transactions")
      .update({ category, reviewed: true })
      .in("store", stores)
      .eq("category", "その他")
      .eq("reviewed", false);

    if (!updateErr) {
      updated += txs.filter((t) => stores.includes(t.store?.trim() ?? "")).length;
    }
  }

  return NextResponse.json({ updated, total: txs.length });
}
