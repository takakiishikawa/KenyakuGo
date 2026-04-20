import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/supabase/auth-db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const body = await req.json();
  const store = typeof body.store === "string" ? body.store.trim() : null;
  if (!store) {
    return NextResponse.json({ error: "store is required" }, { status: 400 });
  }

  const { data: rows, error } = await db
    .from("categories")
    .select("name")
    .order("created_at");

  if (error) {
    return NextResponse.json({ category: "その他" });
  }

  const existing = (rows ?? []).map((r) => r.name);

  let category = "その他";
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.category && typeof parsed.category === "string") {
          category = parsed.category.trim();
        }
      }
    }
  } catch {
    // AI失敗時はデフォルト「その他」
  }

  if (!existing.includes(category)) {
    await db.from("categories").insert({ name: category });
  }

  return NextResponse.json({ category });
}
