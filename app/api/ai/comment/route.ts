import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthDb } from "@/lib/supabase/auth-db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { type, data, periodKey } = await req.json();

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
        if (parsed && typeof parsed === "object") {
          return NextResponse.json({ feedback: parsed });
        }
      } catch {
        /* fall through to plain text */
      }
      return NextResponse.json({ comment: cached.comment });
    }
  }

  let prompt = "";
  let isStructured = false;

  if (type === "weekly") {
    isStructured = true;
    prompt = `ホーチミン在住日本人の週次支出分析（カテゴリ別VND）
今週: ${JSON.stringify(data.thisWeek)}
先週: ${JSON.stringify(data.lastWeek)}

以下のJSON形式のみで回答してください（マークダウン・コードブロック不要、JSONのみ）。
固定費（家賃・通信）は倹約推奨から除外。

{
  "savingsCategory": "最も削減を推奨する裁量的支出カテゴリ名（削減不要ならnull）",
  "savingsSuggestion": "具体的な倹約方法（3つまで、改行区切り、「・」始まり）"
}`;
  } else if (type === "monthly") {
    isStructured = true;
    prompt = `ホーチミン在住日本人の月次支出分析（カテゴリ別VND）
今月: ${JSON.stringify(data.thisWeek)}
先月: ${JSON.stringify(data.lastWeek)}

以下のJSON形式のみで回答してください（マークダウン・コードブロック不要、JSONのみ）。
固定費（家賃・通信）は倹約推奨から除外。

{
  "savingsCategory": "最も削減を推奨する裁量的支出カテゴリ名（削減不要ならnull）",
  "savingsSuggestion": "具体的な倹約方法（3つまで、改行区切り、「・」始まり）"
}`;
  } else if (type === "dam-qa") {
    isStructured = true;
    const d = data as {
      cumulativeBalance: number;
      projectedBalance: number;
      targetMonthly: number;
      monthsCount: number;
      answers: Array<{ question: string; answer: string }>;
    };
    const monthlyProjected = d.targetMonthly; // 毎月予算通りなら
    const futureMonthly = Math.max(
      0,
      d.targetMonthly - (d.projectedBalance ?? 0),
    );
    const qaPairs = d.answers
      .filter((a) => a.answer.trim())
      .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
      .join("\n\n");

    prompt = `あなたはホーチミン在住の日本人の専属ファイナンシャルコーチです。
倹約哲学「ベース支出を抑えて、使う時に使う」を実践しているユーザーへの具体的提案を行います。

【ユーザーの財務状況】
- 月予算: ${d.targetMonthly.toLocaleString("vi-VN")} ₫
- 現在の累計ダム残高: ${d.cumulativeBalance.toLocaleString("vi-VN")} ₫
- 今月の節約見込み: ${d.projectedBalance.toLocaleString("vi-VN")} ₫
- 積み立て開始からの月数: ${d.monthsCount}ヶ月

【ユーザーの回答】
${qaPairs || "（回答なし）"}

【提案の条件】
- ホーチミン/ベトナムで実際に体験・購入できるものを優先
- 具体的な店名・サービス名・ブランド名を含める
- 実際の購入・予約が可能なURLを含める（Lazada.vn, Shopee.vn, Traveloka.com, KKday.com, Klook.com, Booking.comなど実在のサイト）
- 費用は現実的なVND金額で
- ユーザーの回答内容に沿った提案を最優先

以下のJSON形式のみで返してください（マークダウン不要）:
{
  "theme": "ユーザーの回答を踏まえた一言テーマ（20文字以内）",
  "recommendations": [
    {
      "emoji": "絵文字1つ",
      "title": "具体的なタイトル（15文字以内）",
      "description": "ホーチミン/ベトナムの文脈で具体的な説明（2〜3文）",
      "estimatedCost": "X.XXX.XXX ₫",
      "link": "https://実在するURL",
      "linkLabel": "サービス名で予約・購入"
    }
  ]
}
提案は3〜4件。`;
  } else if (type === "dam") {
    isStructured = true;
    const d = data as {
      cumulativeBalance: number;
      currentBalance: number;
      targetMonthly: number;
      categoryBreakdown: Record<string, number>;
    };
    const catEntries = Object.entries(d.categoryBreakdown ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v.toLocaleString("vi-VN")} ₫`)
      .join("、");
    prompt = `あなたはホーチミン在住の倹約家の財務コーチです。

【状況】
- 月予算: ${d.targetMonthly.toLocaleString("vi-VN")} ₫
- 今月の節約見込み: ${d.currentBalance.toLocaleString("vi-VN")} ₫
- 累計貯水量: ${d.cumulativeBalance.toLocaleString("vi-VN")} ₫
- 今月の主な支出: ${catEntries || "データなし"}

【倹約家の哲学】ベース支出を抑えて、使う時に使う。節約は我慢ではなく、本当に価値あるものにお金を使うための手段。

この節約できたお金で「何ができるか」を、ホーチミン・ベトナムの文化・物価・生活に即して3つ提案してください。
抽象的ではなく、具体的な金額・場所・体験を盛り込むこと。

以下のJSON形式のみで返してください（マークダウン不要）:
{
  "suggestions": [
    { "emoji": "絵文字1つ", "title": "タイトル（10文字以内）", "detail": "具体的な説明（2文程度、ホーチミン/ベトナムの文脈）" },
    { "emoji": "絵文字1つ", "title": "タイトル（10文字以内）", "detail": "具体的な説明（2文程度）" },
    { "emoji": "絵文字1つ", "title": "タイトル（10文字以内）", "detail": "具体的な説明（2文程度）" }
  ]
}`;
  }

  // dam-qa は提案3〜4件×6フィールドで500では切れるため多めに確保
  const maxTokens = type === "dam-qa" ? 1500 : 600;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  if (isStructured) {
    let feedback: Record<string, unknown> = {};
    try {
      // コードブロック記法を除去してからパース
      const cleaned = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) feedback = JSON.parse(match[0]);
    } catch {
      /* パース失敗時は空 */
    }

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
    await db
      .from("ai_comments")
      .upsert({ period_key: periodKey, comment: text });
  }

  return NextResponse.json({ comment: text });
}
