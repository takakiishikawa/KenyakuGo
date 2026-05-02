import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SubscriptionJudgment = "sub" | "not_sub" | "unknown";

export interface SubscriptionCandidate {
  store: string;
  category: string;
  amount: number;
}

export interface SubscriptionClassification {
  store: string;
  judgment: SubscriptionJudgment;
  reason: string;
}

const BATCH_SIZE = 30;

export async function classifySubscriptionCandidates(
  candidates: SubscriptionCandidate[],
): Promise<SubscriptionClassification[]> {
  if (candidates.length === 0) return [];

  const batches: SubscriptionCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const list = batch
        .map(
          (c, i) =>
            `${i + 1}. ${c.store} | カテゴリ: ${c.category} | 金額: ${c.amount.toLocaleString()} VND`,
        )
        .join("\n");

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `ベトナム・ホーチミン在住の日本人のクレジットカード明細から、店舗が「サブスクリプション（SaaS・定額制ソフトウェア・月額課金型サービス）」かを判定してください。

【sub に該当（確信があるもののみ）】
Figma, Netflix, Spotify, Adobe, GitHub, ChatGPT/Anthropic/OpenAI, Obsidian, Notion, Dropbox, iCloud, Google One/YouTube Premium, ジム月会費, 携帯通信料, インターネット回線, クラウドストレージ, 動画/音楽配信, 新聞/雑誌購読

【not_sub に該当（明らかに違うもの）】
- スーパー / 食料品店（Co.op Mart, Vinmart, Bach Hoa Xanh など）
- 飲食店 / レストラン / カフェ / バー（Gyumaru, Mutsumian, Starbucks など）
- アパレル / 衣料品店（UNIQLO, Zara など）
- マッサージ店 / 美容院（基本は都度払い）
- 家電 / 家具 / 書籍などの単発購入
- タクシー / 配車サービス（Grab など）
- 送金 / 振込 / ATM
- 家賃 / 公共料金（電気・水道・ガス）

【unknown に該当】
- ブランド名から判断できない（無名の英数字、ベトナム語の会社名で業態不明）
- SaaS 系のように見えるが実体が掴めない

【ルール】
- 不明な店舗は必ず unknown にする。誤検知を絶対避ける
- 同じ店で似た金額が定期的に発生していても、それが「商品の繰り返し購入」「常連通い」であれば not_sub
- カテゴリが「外食」「自炊」「ファッション」「マッサージ」「交通費」「医療費」のものは not_sub
- 判定理由は20文字以内で簡潔に

【候補】
${list}

JSON配列のみで返してください（マークダウン・コードブロック不要）:
[{"store": "店名（入力と完全一致）", "judgment": "sub" | "not_sub" | "unknown", "reason": "20文字以内の理由"}]`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "[]";
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try {
        const parsed = JSON.parse(match[0]) as Array<{
          store: string;
          judgment: string;
          reason?: string;
        }>;
        return parsed
          .filter(
            (p) =>
              p.store &&
              (p.judgment === "sub" ||
                p.judgment === "not_sub" ||
                p.judgment === "unknown"),
          )
          .map<SubscriptionClassification>((p) => ({
            store: p.store,
            judgment: p.judgment as SubscriptionJudgment,
            reason: p.reason ?? "",
          }));
      } catch {
        return [];
      }
    }),
  );

  return results.flat();
}
