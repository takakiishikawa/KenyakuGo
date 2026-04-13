import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createDb } from "@/lib/supabase/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { type, data, periodKey } = await req.json();
  const db = createDb();

  // キャッシュ確認（periodKey がある場合のみ）
  if (periodKey) {
    const { data: cached } = await db
      .from("ai_comments")
      .select("comment")
      .eq("period_key", periodKey)
      .maybeSingle();

    if (cached?.comment) {
      // 構造化フィードバック（JSON）か旧フォーマット（プレーンテキスト）か判定
      try {
        const parsed = JSON.parse(cached.comment);
        if (parsed.analysis !== undefined) {
          return NextResponse.json({ feedback: parsed });
        }
      } catch { /* fall through to plain text */ }
      return NextResponse.json({ comment: cached.comment });
    }
  }

  let prompt = "";
  let isStructured = false;

  if (type === "dashboard") {
    const entries = Object.entries(data as Record<string, number>)
      .map(([k, v]) => `${k}: ${v.toLocaleString()} VND`)
      .join(", ");
    prompt = `今週の支出サマリー: ${entries}\nこの支出について、ホーチミン在住の日本人に向けたポジティブで励ましになる日本語コメントを1〜2文で生成してください。`;
  } else if (type === "weekly") {
    isStructured = true;
    prompt = `ホーチミン在住日本人の週次支出分析（カテゴリ別VND）
今週: ${JSON.stringify(data.thisWeek)}
先週: ${JSON.stringify(data.lastWeek)}

以下のJSON形式のみで回答してください（マークダウン・コードブロック不要、JSONのみ）。
固定費（家賃・ローン・公共料金・通信費）は倹約推奨から除外。

{
  "analysis": "今週の支出についての簡潔な総評（2文以内、日本語）",
  "savingsCategory": "最も削減を推奨する裁量的支出カテゴリ名（削減不要ならnull）",
  "savingsReason": "そのカテゴリを推奨する理由（1文、日本語）",
  "savingsSuggestion": "具体的な倹約方法（3つまで、改行区切り、「・」始まり）"
}`;
  } else if (type === "monthly") {
    isStructured = true;
    prompt = `ホーチミン在住日本人の月次支出分析（カテゴリ別VND）
今月: ${JSON.stringify(data.thisWeek)}
先月: ${JSON.stringify(data.lastWeek)}

以下のJSON形式のみで回答してください（マークダウン・コードブロック不要、JSONのみ）。
固定費（家賃・ローン・公共料金・通信費）は倹約推奨から除外。

{
  "analysis": "今月の支出についての簡潔な総評（2文以内、日本語）",
  "savingsCategory": "最も削減を推奨する裁量的支出カテゴリ名（削減不要ならnull）",
  "savingsReason": "そのカテゴリを推奨する理由（1文、日本語）",
  "savingsSuggestion": "具体的な倹約方法（3つまで、改行区切り、「・」始まり）"
}`;
  } else if (type === "dam") {
    prompt = `累計ダム残高: ${(data.cumulativeBalance as number).toLocaleString()} VND\nホーチミン生活を楽しくする視点で「このお金で何ができる？」を具体的に提案してください。日本語で2〜3文。`;
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  if (isStructured) {
    let feedback: Record<string, unknown> = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) feedback = JSON.parse(match[0]);
    } catch { /* パース失敗時は空 */ }

    // キャッシュ保存（JSON文字列として保存）
    if (periodKey && Object.keys(feedback).length > 0) {
      await db.from("ai_comments").upsert({
        period_key: periodKey,
        comment: JSON.stringify(feedback),
      });
    }

    return NextResponse.json({ feedback });
  }

  // キャッシュ保存（プレーンテキスト）
  if (periodKey && text) {
    await db.from("ai_comments").upsert({ period_key: periodKey, comment: text });
  }

  return NextResponse.json({ comment: text });
}
