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

  const existingSet = new Set(existing);

  let category = "その他";
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `以下の店名に最も適切なカテゴリを既存カテゴリの中から1つだけ選んでください。
店名: ${store}
既存カテゴリ: ${existing.join(", ")}

新規カテゴリは作成しないでください。どれにも当てはまらない場合は必ず「その他」を返してください。
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
          const picked = parsed.category.trim();
          category = existingSet.has(picked) ? picked : "その他";
        }
      }
    }
  } catch {
    // AI失敗時はデフォルト「その他」
  }

  return NextResponse.json({ category });
}
