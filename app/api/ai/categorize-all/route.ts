import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 300;

export async function POST() {
  const db = createDb();

  const { data: uncategorized, error } = await db
    .from("transactions")
    .select("id, store")
    .eq("category", "その他");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: rows } = await db
    .from("categories")
    .select("name")
    .order("created_at");

  const existing = (rows ?? []).map((r) => r.name);
  let updated = 0;

  for (const tx of uncategorized ?? []) {
    const store = tx.store?.trim();

    // 店名が空 or 転送っぽい場合
    if (!store || /chuyen|transfer|remit|remittance/i.test(store)) {
      let cat = "転送";
      if (!existing.includes(cat)) {
        await db.from("categories").insert({ name: cat });
        existing.push(cat);
      }
      await db.from("transactions").update({ category: cat }).eq("id", tx.id);
      updated++;
      continue;
    }

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `以下の店名に最も適切なカテゴリを1つ返してください。
店名: ${store}
既存カテゴリ: ${existing.join(", ")}

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

      const parsed = JSON.parse(jsonMatch[0]);
      const category = parsed.category?.trim();
      if (!category) continue;

      if (!existing.includes(category)) {
        await db.from("categories").insert({ name: category });
        existing.push(category);
      }

      await db.from("transactions").update({ category }).eq("id", tx.id);
      updated++;
    } catch {
      // 失敗した場合はスキップ
    }
  }

  return NextResponse.json({ updated, total: (uncategorized ?? []).length });
}
