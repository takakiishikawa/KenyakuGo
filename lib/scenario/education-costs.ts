import type { EduStageKey } from "./types";

// 要件6章の教育費目安テーブル。単位は円/年(習い事・塾込みの合算目安)。
// デザイン(PiggyBank.dc.html)の EDU_COSTS を移植。
export interface EduStageOption {
  key: string;
  labelJa: string;
  labelEn: string;
  amountYen: number; // 0 も含む実額(「進学しない」は0)
}

export interface EduStageDef {
  key: EduStageKey;
  labelJa: string;
  labelEn: string;
  ageMin: number;
  ageMax: number;
  options: EduStageOption[];
  tipJa: string;
  tipEn: string;
}

export const EDU_STAGES: EduStageDef[] = [
  {
    key: "infant1",
    labelJa: "幼児(0-2歳)",
    labelEn: "Infant (0-2)",
    ageMin: 0,
    ageMax: 2,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 350_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 550_000 },
    ],
    tipJa:
      "保育料目安(習い事込):公立約35万円/年・私立約55万円/年。認可保育園は所得により0〜7万円/月程度、認可外は高額になる場合も。",
    tipEn:
      "Approx. incl. lessons: public ~¥350k/yr, private ~¥550k/yr. Licensed nurseries scale with income (¥0-70k/mo); unlicensed can be much higher.",
  },
  {
    key: "infant2",
    labelJa: "幼児(3-5歳)",
    labelEn: "Infant (3-5)",
    ageMin: 3,
    ageMax: 5,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 330_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 630_000 },
    ],
    tipJa:
      "幼稚園目安(習い事込):公立約33万円/年・私立約63万円/年。幼保無償化により保育料は軽減。習い事はスイミング・英語等が人気。",
    tipEn:
      "Approx. incl. lessons: public ~¥330k/yr, private ~¥630k/yr. Free tuition subsidy reduces base cost; swimming/English lessons are common add-ons.",
  },
  {
    key: "elementary",
    labelJa: "小学校",
    labelEn: "Elementary",
    ageMin: 6,
    ageMax: 11,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 600_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 1_920_000 },
    ],
    tipJa:
      "小学校目安(塾・習い事込):公立約60万円/年・私立約192万円/年。私立は入学金別途100万円程度。塾・習い事は学年が上がるにつれ増加傾向。",
    tipEn:
      "Approx. incl. cram school: public ~¥600k/yr, private ~¥1.92M/yr. Private adds a ~¥1M entrance fee; tutoring costs rise in later grades.",
  },
  {
    key: "junior",
    labelJa: "中学校",
    labelEn: "Junior High",
    ageMin: 12,
    ageMax: 14,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 940_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 1_840_000 },
    ],
    tipJa:
      "中学校目安(塾込):公立約94万円/年・私立約184万円/年。高校受験に向けた塾代が大きい。私立は入学金別途20〜30万円程度。",
    tipEn:
      "Approx. incl. cram school: public ~¥940k/yr, private ~¥1.84M/yr. High-school entrance exam prep drives cram-school cost; private adds a ¥200-300k entrance fee.",
  },
  {
    key: "high",
    labelJa: "高校",
    labelEn: "High School",
    ageMin: 15,
    ageMax: 17,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 1_010_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 1_550_000 },
    ],
    tipJa:
      "高校目安(塾込):公立約101万円/年・私立約155万円/年。公立は就学支援金で実質無償化に近い。大学受験塾代が増加。私立は入学金別途20〜40万円。",
    tipEn:
      "Approx. incl. cram school: public ~¥1.01M/yr, private ~¥1.55M/yr. Public tuition is nearly free via the support grant; private adds a ¥200-400k entrance fee.",
  },
  {
    key: "university",
    labelJa: "大学",
    labelEn: "University",
    ageMin: 18,
    ageMax: 21,
    options: [
      { key: "public", labelJa: "公立", labelEn: "Public", amountYen: 540_000 },
      { key: "private", labelJa: "私立", labelEn: "Private", amountYen: 1_350_000 },
    ],
    tipJa:
      "大学目安:国公立約54万円/年(授業料のみ)。私立は文系・理系の平均で約135万円/年。入学金別途20〜30万円。",
    tipEn:
      "Approx: national/public ~¥540k/yr (tuition only). Private ~¥1.35M/yr (average of arts/science). Entrance fee ¥200-300k extra.",
  },
];

const STAGE_BY_KEY = new Map(EDU_STAGES.map((s) => [s.key, s]));

export function eduStageForAge(age: number): EduStageDef | null {
  return EDU_STAGES.find((s) => age >= s.ageMin && age <= s.ageMax) ?? null;
}

// kidEducation: そのシナリオの education["<kidIndex>"] (stageKey -> 年額円)。
// 未入力(そのステージをまだ一度も編集していない)なら公立の目安額を仮の値として使う。
export function eduCostForAge(age: number, kidEducation: Record<string, number> | undefined): number {
  const stage = eduStageForAge(age);
  if (!stage) return 0;
  const stored = kidEducation?.[stage.key];
  if (typeof stored === "number" && Number.isFinite(stored)) return stored;
  return stage.options[0].amountYen;
}

export function getEduStage(key: string): EduStageDef | undefined {
  return STAGE_BY_KEY.get(key as EduStageKey);
}
