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

const incomeEntrySchema = z.object({
  amountYen: z.number().min(0),
  raisePercent: z.number(),
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
    husband: { amountYen: 450000, raisePercent: 2 },
    wife: { amountYen: 250000, raisePercent: 1.5 },
    side: { amountYen: 0 },
  },
  education: {},
  events: [],
  savings: { returnRatePercent: 5, investRatioPercent: 60 },
  inflationRatePercent: 1,
};
