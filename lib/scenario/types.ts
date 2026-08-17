import { z } from "zod";

// 教育費テーブルのステージキー(lib/scenario/education-costs.ts と対応)。
export const EDU_STAGE_KEYS = [
  "infant1",
  "infant2",
  "elementary",
  "junior",
  "high",
  "university",
] as const;
export type EduStageKey = (typeof EDU_STAGE_KEYS)[number];

const kidSchema = z.object({
  birthYear: z.number().int(),
});

// 産休・育休: 指定期間だけ月収を通常の incomePercent% に減らす(0=無収入)。
// 要件5-2「支出>イベントの出産イベントと連動する」は、期間を出産予定に合わせて
// 手動で入力する運用とする(自動連動はしない)。
const leavePeriodSchema = z.object({
  id: z.string(),
  fromYear: z.number().int(),
  fromMonth: z.number().int().min(1).max(12),
  toYear: z.number().int(),
  toMonth: z.number().int().min(1).max(12),
  incomePercent: z.number().min(0).max(100),
});

// 手取り(税・社会保険料控除後)で入力してもらう。額面年収は
// (netMonthlyYen*12 + netBonusYen) / 0.8 として設定モーダル側で参照用に逆算表示する
// (view-onlyであり、この構成には保存しない)。
const incomeEntrySchema = z.object({
  netMonthlyYen: z.number().min(0),
  netBonusYen: z.number().min(0),
  raisePercent: z.number(),
  leavePeriods: z.array(leavePeriodSchema),
});

const eventSchema = z.object({
  id: z.string(),
  label: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  amountYen: z.number(),
});

// 同棲前の暮らし(固定費/変動費)。同棲後は既存の categories /
// category_budget_overrides をそのまま使うが、同棲前はDashboardと共有する実データが
// 無い(別居中の想定支出のため)ので、シナリオ側にシンプルな一覧として持つ。
const lifeItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  monthlyYen: z.number().min(0),
});

// startYear年から「同棲後」の暮らし(共有categories)・配偶者の収入が反映される。
// それより前の年は preFixed/preVariable を使い、配偶者の収入は0として扱う。
// moveInBonusYen: 同棲開始年に一度だけ加算される一時収入(例: 相手が共通口座に
// 入れる資金)。
const cohabitationSchema = z.object({
  startYear: z.number().int(),
  moveInBonusYen: z.number(),
  preFixed: z.array(lifeItemSchema),
  preVariable: z.array(lifeItemSchema),
});

// シナリオが持つ、カテゴリ(piggybank.categories)では表現できない前提のみ。
// 「暮らし」(固定費/変動費)の実額は categories / category_budget_overrides を
// 共有で参照するため、ここには含まない(同棲前を除く。上記参照)。
export const scenarioConfigSchema = z.object({
  family: z.object({
    spouse: z.boolean(),
    kids: z.array(kidSchema),
  }),
  income: z.object({
    husband: incomeEntrySchema,
    wife: incomeEntrySchema,
    side: z.object({ amountYen: z.number().min(0) }),
  }),
  cohabitation: cohabitationSchema,
  // キー: kids配列のindex(文字列)。値: ステージキー -> 選択した進路キー。
  education: z.record(z.string(), z.record(z.string(), z.string())),
  events: z.array(eventSchema),
  savings: z.object({
    returnRatePercent: z.number(),
    investRatioPercent: z.number().min(0).max(100),
  }),
  inflationRatePercent: z.number(),
});

export type ScenarioConfig = z.infer<typeof scenarioConfigSchema>;

export interface Scenario {
  id: string;
  name: string;
  is_primary: boolean;
  config: ScenarioConfig;
  created_at: string;
  updated_at: string;
}

// 収入モデル(額面→手取り月/ボーナス)・cohabitation・leavePeriods を後から追加した
// ため、それより前に保存されたシナリオはこれらのキーを欠いた古い形のJSONBのまま
// DBに残っている。normalizeScenarioConfig はそれを読み込む際にデフォルト値で
// 補完し、compute.ts が undefined 参照でクラッシュしないようにする
// (「/simulation This page couldn't load」の原因だった)。
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeIncomeEntry(raw: unknown, fallback: ScenarioConfig["income"]["husband"]): ScenarioConfig["income"]["husband"] {
  const r = isRecord(raw) ? raw : {};
  // 旧形式: { amountYen, raisePercent } (額面の月額のみ) → 手取り月額として引き継ぐ。
  if (typeof r.amountYen === "number" && typeof r.netMonthlyYen !== "number") {
    return {
      netMonthlyYen: r.amountYen,
      netBonusYen: 0,
      raisePercent: typeof r.raisePercent === "number" ? r.raisePercent : fallback.raisePercent,
      leavePeriods: [],
    };
  }
  return {
    netMonthlyYen: typeof r.netMonthlyYen === "number" ? r.netMonthlyYen : fallback.netMonthlyYen,
    netBonusYen: typeof r.netBonusYen === "number" ? r.netBonusYen : fallback.netBonusYen,
    raisePercent: typeof r.raisePercent === "number" ? r.raisePercent : fallback.raisePercent,
    leavePeriods: Array.isArray(r.leavePeriods) ? (r.leavePeriods as ScenarioConfig["income"]["husband"]["leavePeriods"]) : [],
  };
}

export function normalizeScenarioConfig(raw: unknown): ScenarioConfig {
  const r = isRecord(raw) ? raw : {};
  const d = DEFAULT_SCENARIO_CONFIG;
  const family = isRecord(r.family) ? r.family : {};
  const income = isRecord(r.income) ? r.income : {};
  const side = isRecord(income.side) ? income.side : {};
  const cohabitation = isRecord(r.cohabitation) ? r.cohabitation : {};
  const savings = isRecord(r.savings) ? r.savings : {};

  return {
    family: {
      spouse: typeof family.spouse === "boolean" ? family.spouse : d.family.spouse,
      kids: Array.isArray(family.kids) ? (family.kids as ScenarioConfig["family"]["kids"]) : d.family.kids,
    },
    income: {
      husband: normalizeIncomeEntry(income.husband, d.income.husband),
      wife: normalizeIncomeEntry(income.wife, d.income.wife),
      side: { amountYen: typeof side.amountYen === "number" ? side.amountYen : d.income.side.amountYen },
    },
    cohabitation: {
      startYear: typeof cohabitation.startYear === "number" ? cohabitation.startYear : d.cohabitation.startYear,
      moveInBonusYen: typeof cohabitation.moveInBonusYen === "number" ? cohabitation.moveInBonusYen : d.cohabitation.moveInBonusYen,
      preFixed: Array.isArray(cohabitation.preFixed) ? (cohabitation.preFixed as ScenarioConfig["cohabitation"]["preFixed"]) : [],
      preVariable: Array.isArray(cohabitation.preVariable) ? (cohabitation.preVariable as ScenarioConfig["cohabitation"]["preVariable"]) : [],
    },
    education: isRecord(r.education) ? (r.education as ScenarioConfig["education"]) : d.education,
    events: Array.isArray(r.events) ? (r.events as ScenarioConfig["events"]) : d.events,
    savings: {
      returnRatePercent: typeof savings.returnRatePercent === "number" ? savings.returnRatePercent : d.savings.returnRatePercent,
      investRatioPercent: typeof savings.investRatioPercent === "number" ? savings.investRatioPercent : d.savings.investRatioPercent,
    },
    inflationRatePercent: typeof r.inflationRatePercent === "number" ? r.inflationRatePercent : d.inflationRatePercent,
  };
}

export const DEFAULT_SCENARIO_CONFIG: ScenarioConfig = {
  family: { spouse: true, kids: [] },
  income: {
    husband: { netMonthlyYen: 300000, netBonusYen: 600000, raisePercent: 2, leavePeriods: [] },
    wife: { netMonthlyYen: 180000, netBonusYen: 300000, raisePercent: 1.5, leavePeriods: [] },
    side: { amountYen: 0 },
  },
  cohabitation: { startYear: new Date().getFullYear(), moveInBonusYen: 0, preFixed: [], preVariable: [] },
  education: {},
  events: [],
  savings: { returnRatePercent: 5, investRatioPercent: 60 },
  inflationRatePercent: 1,
};
