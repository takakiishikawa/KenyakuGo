import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { type, data } = await req.json();

  let prompt = "";

  if (type === "dashboard") {
    const entries = Object.entries(data as Record<string, number>)
      .map(([k, v]) => `${k}: ${v.toLocaleString()} VND`)
      .join(", ");
    prompt = `今週の支出サマリー: ${entries}\nこの支出について、ホーチミン在住の日本人に向けたポジティブで励ましになる日本語コメントを1〜2文で生成してください。`;
  } else if (type === "weekly") {
    prompt = `今週のカテゴリ別支出: ${JSON.stringify(data.thisWeek)}\n先週のカテゴリ別支出: ${JSON.stringify(data.lastWeek)}\n今週と先週を比較して、ポジティブな分析コメントを日本語で1〜3文生成してください。`;
  } else if (type === "dam") {
    prompt = `累計ダム残高: ${(data.cumulativeBalance as number).toLocaleString()} VND\nホーチミン生活を楽しくする視点で「このお金で何ができる？」を具体的に提案してください。日本語で2〜3文。`;
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ comment: text });
}
