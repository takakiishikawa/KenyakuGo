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

// シナリオが持つ、カテゴリ(piggybank.categories)では表現できない前提のみ。
// 「暮らし」(固定費/変動費)の実額は categories / category_budget_overrides を
// 共有で参照するため、ここには含まない。
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

export const DEFAULT_SCENARIO_CONFIG: ScenarioConfig = {
  family: { spouse: true, kids: [] },
  income: {
    husband: { netMonthlyYen: 300000, netBonusYen: 600000, raisePercent: 2, leavePeriods: [] },
    wife: { netMonthlyYen: 180000, netBonusYen: 300000, raisePercent: 1.5, leavePeriods: [] },
    side: { amountYen: 0 },
  },
  education: {},
  events: [],
  savings: { returnRatePercent: 5, investRatioPercent: 60 },
  inflationRatePercent: 1,
};
