import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = [
  "食費（外食）",
  "食費（自炊）",
  "固定費",
  "マッサージ・スパ",
  "エンタメ",
  "引き出し（現金）",
  "その他",
];

export async function POST(req: NextRequest) {
  const { store } = await req.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `以下の店名から最も適切なカテゴリを1つ選んでください。
店名: ${store}
カテゴリ: ${CATEGORIES.join(", ")}
{"category": "カテゴリ名"} のJSONのみ返してください。前置きは不要です。`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ category: "その他" });
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const category = CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "その他";
      return NextResponse.json({ category });
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({ category: "その他" });
}
