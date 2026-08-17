"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Trash2, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@takaki/go-design-system";
import type { DisplayCurrency } from "@/components/currency-switch";
import { formatJPY, formatVND } from "@/lib/format";
import type { CategoryBudgetOverride } from "@/lib/category-budget";
import { CategoryBudgetCard, type CategoryForCard } from "@/components/category-budget-card";
import { EDU_STAGES } from "@/lib/scenario/education-costs";
import { t, tf, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";
import type { Scenario, ScenarioConfig } from "@/lib/scenario/types";
import { HelpTip } from "./help-tip";

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => CUR_YEAR + i);
const MONTH_LABELS_JA = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ConfigTab = "family" | "income" | "spending" | "savingsTab";
type SpendingSub = "life" | "education" | "events";
type LifeSub = "fixed" | "variable";

function cloneConfig(config: ScenarioConfig): ScenarioConfig {
  return JSON.parse(JSON.stringify(config));
}

// 生まれ年が未来(まだ生まれていない予定の子ども)だと age が負になり
// 「今年-3歳」のような表示になってしまうので、その場合は生まれ年予定として表示する。
// includeYear=false は、生まれ年をすぐ隣の入力欄で既に表示している場合用
// (「2029」の入力欄の隣に「2029年生まれ予定」と出て年が重複するのを避ける)。
function ageLabel(lang: Lang, birthYear: number, includeYear = true): string {
  const age = CUR_YEAR - birthYear;
  if (age < 0) {
    if (!includeYear) return lang === "ja" ? "生まれ予定" : "not yet born";
    return lang === "ja" ? `${birthYear}年生まれ予定` : `due ${birthYear}`;
  }
  return tf(lang, "ageThisYear", { age });
}

// 千区切りカンマを表示しながら、値自体は数値で保持するyen入力。
function YenInput({
  value,
  onChange,
  onCommit,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  onCommit?: () => void;
  className?: string;
}) {
  const digitsOnly = (s: string) => s.replace(/[^0-9]/g, "");
  const withCommas = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const [text, setText] = useState(digitsOnly(String(value)));

  useEffect(() => {
    setText(digitsOnly(String(value)));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={withCommas(text)}
      onChange={(e) => {
        const digits = digitsOnly(e.target.value);
        setText(digits);
        onChange(digits === "" ? 0 : Number(digits));
      }}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}

export function ScenarioSettingsDialog({
  open,
  onOpenChange,
  scenario,
  isCompare,
  scenarios,
  editTargetId,
  onEditTargetChange,
  categories,
  overrides,
  onConfigChange,
  onSaveAsNew,
  onCategoryUpdate,
  onCategoryAdd,
  onCategoryDelete,
  onScheduleOverride,
  onDeleteOverride,
  lang,
  currency,
  vndPerJpy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario;
  isCompare: boolean;
  scenarios: Scenario[];
  editTargetId: string;
  onEditTargetChange: (id: string) => void;
  categories: CategoryForCard[];
  overrides: CategoryBudgetOverride[];
  onConfigChange: (scenarioId: string, config: ScenarioConfig) => Promise<void>;
  onSaveAsNew: (name: string, config: ScenarioConfig) => Promise<void>;
  onCategoryUpdate: (
    id: string,
    patch: Partial<Pick<CategoryForCard, "name" | "budget" | "is_fixed" | "renewal_cycle_years" | "renewal_fee_months">>,
  ) => Promise<void>;
  onCategoryAdd: (name: string, budget: number, isFixed: boolean) => Promise<void>;
  onCategoryDelete: (id: string) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string) => Promise<void>;
  lang: Lang;
  currency: DisplayCurrency;
  vndPerJpy: number;
}) {
  const [configTab, setConfigTab] = useState<ConfigTab>("family");
  const [spendingSub, setSpendingSub] = useState<SpendingSub>("life");
  const [lifeSub, setLifeSub] = useState<LifeSub>("fixed");
  const [lifePhase, setLifePhase] = useState<"pre" | "post">("post");
  const [addLifeItemLabel, setAddLifeItemLabel] = useState("");
  const [addLifeItemAmount, setAddLifeItemAmount] = useState("");
  const [draft, setDraft] = useState<ScenarioConfig>(() => cloneConfig(scenario.config));
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [addCatName, setAddCatName] = useState("");
  const [addCatBudget, setAddCatBudget] = useState("");

  useEffect(() => {
    setDraft(cloneConfig(scenario.config));
  }, [scenario.id, scenario.config]);

  const fixedCats = useMemo(() => categories.filter((c) => c.is_fixed), [categories]);
  const variableCats = useMemo(() => categories.filter((c) => !c.is_fixed), [categories]);
  const overridesByCategory = useMemo(() => {
    const m = new Map<string, CategoryBudgetOverride[]>();
    for (const o of overrides) {
      const arr = m.get(o.category_id);
      if (arr) arr.push(o);
      else m.set(o.category_id, [o]);
    }
    return m;
  }, [overrides]);

  const commit = (next: ScenarioConfig) => {
    setDraft(next);
    onConfigChange(scenario.id, next);
  };

  // 額面年収 = (月額手取り×12 + ボーナス手取り) ÷ 0.8 (参考表示のみ、入力不可)
  const grossAnnualYen =
    ((draft.income.husband.netMonthlyYen * 12 + draft.income.husband.netBonusYen) +
      (draft.family.spouse ? draft.income.wife.netMonthlyYen * 12 + draft.income.wife.netBonusYen : 0)) /
    0.8;
  // grossAnnualYen は円建ての値なので、VND-native な formatAmount ではなく
  // 通貨に応じた円/VNDフォーマッタを直接使う(以前は formatAmount にそのまま渡していて
  // 162で余計に割られ、額面が桁違いに小さく表示されるバグがあった)。
  const grossAnnualPreview = currency === "JPY" ? formatJPY(grossAnnualYen) : formatVND(grossAnnualYen * vndPerJpy);

  const monthLabels = lang === "ja" ? MONTH_LABELS_JA : MONTH_LABELS_EN;

  const tabs: { key: ConfigTab; label: string }[] = [
    { key: "family", label: t(lang, "family") },
    { key: "income", label: t(lang, "income") },
    { key: "spending", label: t(lang, "spending") },
    { key: "savingsTab", label: t(lang, "savingsTab") },
  ];

  // 教育費は「支出→教育」タブだけで扱う(家族タブには進路選択を置かない)。
  // 公立/私立ボタンは金額欄へのクイック入力であり、選んだ後も自由に金額を編集できる。
  const kidEducationMatrix = (
    <div className="flex flex-col gap-2.5">
      {draft.family.kids.length === 0 ? (
        <p className="text-xs" style={{ color: DC.textSecondary }}>
          {t(lang, "children")}: 0
        </p>
      ) : (
        draft.family.kids.map((kid, kidIdx) => (
          <div key={kidIdx} className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: DC.trackAlt }}>
            <div className="text-xs font-semibold" style={{ color: DC.textPrimary }}>
              {t(lang, "children")} {kidIdx + 1}{" "}
              <span className="font-normal" style={{ color: DC.textSecondary }}>
                ({ageLabel(lang, kid.birthYear)})
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {EDU_STAGES.map((stage) => {
                const kidEdu = draft.education[String(kidIdx)] ?? {};
                const amount = kidEdu[stage.key] ?? stage.options[0].amountYen;
                return (
                  <div key={stage.key} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs w-24 shrink-0 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                      {lang === "ja" ? stage.labelJa : stage.labelEn}
                      <HelpTip text={lang === "ja" ? stage.tipJa : stage.tipEn} />
                    </span>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      {stage.options.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            const education = { ...draft.education };
                            education[String(kidIdx)] = { ...(education[String(kidIdx)] ?? {}), [stage.key]: opt.amountYen };
                            commit({ ...draft, education });
                          }}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border"
                          style={{
                            backgroundColor: amount === opt.amountYen ? DC.primary : DC.cardBg,
                            color: amount === opt.amountYen ? "#fff" : DC.textSecondary,
                            borderColor: amount === opt.amountYen ? DC.primary : DC.cardBorder,
                          }}
                        >
                          {lang === "ja" ? opt.labelJa : opt.labelEn}
                        </button>
                      ))}
                    </div>
                    <YenInput
                      value={amount}
                      onChange={(n) => {
                        const education = { ...draft.education };
                        education[String(kidIdx)] = { ...(education[String(kidIdx)] ?? {}), [stage.key]: n };
                        setDraft({ ...draft, education });
                      }}
                      onCommit={() => commit(draft)}
                      className="h-7 w-24 text-xs text-right font-num"
                    />
                    <span className="text-xs shrink-0" style={{ color: DC.textSecondary }}>
                      {t(lang, "yenPerYear")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>
            {t(lang, "settingsBtn")} — {scenario.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[80vh] overflow-y-auto flex flex-col gap-3.5">
          {isCompare && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: DC.textSecondary }}>
                {t(lang, "editTarget")}
              </span>
              <Select value={editTargetId} onValueChange={onEditTargetChange}>
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setConfigTab(tab.key)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  backgroundColor: configTab === tab.key ? DC.textPrimary : "transparent",
                  color: configTab === tab.key ? "#fff" : DC.textSecondary,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {configTab === "family" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs w-24" style={{ color: DC.textSecondary }}>
                  {t(lang, "spouse")}
                </span>
                <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: DC.track }}>
                  {[
                    { v: true, l: t(lang, "spouseYes") },
                    { v: false, l: t(lang, "spouseNo") },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => commit({ ...draft, family: { ...draft.family, spouse: o.v } })}
                      className="px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        backgroundColor: draft.family.spouse === o.v ? DC.primary : "transparent",
                        color: draft.family.spouse === o.v ? "#fff" : DC.textSecondary,
                      }}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {draft.family.spouse && (
                <div className="flex flex-col gap-2 rounded-lg border p-2.5" style={{ borderColor: DC.trackAlt }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs w-32 shrink-0 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                      {t(lang, "cohabitationStartYear")}
                      <HelpTip text={t(lang, "cohabitationHelp")} />
                    </span>
                    <Select
                      value={String(draft.cohabitation.startYear)}
                      onValueChange={(v) => commit({ ...draft, cohabitation: { ...draft.cohabitation, startYear: Number(v) } })}
                    >
                      <SelectTrigger className="h-8 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs w-32 shrink-0 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                      {t(lang, "moveInBonus")}
                      <HelpTip text={t(lang, "moveInBonusHelp")} />
                    </span>
                    <YenInput
                      value={draft.cohabitation.moveInBonusYen}
                      onChange={(n) => setDraft({ ...draft, cohabitation: { ...draft.cohabitation, moveInBonusYen: n } })}
                      onCommit={() => commit(draft)}
                      className="h-8 w-28 text-xs text-right font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {t(lang, "yenPerYear")}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: DC.textSecondary }}>
                  {t(lang, "children")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    commit({
                      ...draft,
                      family: {
                        ...draft.family,
                        kids: [...draft.family.kids, { birthYear: CUR_YEAR, leaveParent: "none", leaveExtensionYears: 0 }],
                      },
                    })
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all hover:brightness-95"
                  style={{ backgroundColor: DC.track, color: DC.textSecondary }}
                >
                  <Plus size={12} /> {t(lang, "addChild")}
                </button>
              </div>

              {draft.family.kids.map((kid, kidIdx) => (
                <div key={kidIdx} className="rounded-lg border p-3 flex flex-col gap-2.5" style={{ borderColor: DC.trackAlt }}>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={kid.birthYear}
                      onChange={(e) => {
                        const kids = [...draft.family.kids];
                        kids[kidIdx] = { ...kids[kidIdx], birthYear: Number(e.target.value) };
                        commit({ ...draft, family: { ...draft.family, kids } });
                      }}
                      className="h-7 w-20 text-sm font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {ageLabel(lang, kid.birthYear, false)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        commit({
                          ...draft,
                          family: { ...draft.family, kids: draft.family.kids.filter((_, i) => i !== kidIdx) },
                        })
                      }
                      className="ml-auto p-1 rounded transition-all hover:bg-muted"
                      style={{ color: DC.textSecondary }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {draft.family.spouse && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: DC.trackAlt }}>
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: DC.textPrimary }}>
                      {t(lang, "leaveParentLabel")}
                      <HelpTip text={t(lang, "leaveHelp")} />
                    </span>
                    <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
                      {(
                        [
                          { v: "none" as const, l: t(lang, "leaveParentNone") },
                          { v: "wife" as const, l: t(lang, "leaveParentWife") },
                        ]
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => {
                            const kids = [...draft.family.kids];
                            kids[kidIdx] = { ...kids[kidIdx], leaveParent: o.v };
                            commit({ ...draft, family: { ...draft.family, kids } });
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all"
                          style={{
                            backgroundColor: kid.leaveParent === o.v ? DC.primary : "transparent",
                            color: kid.leaveParent === o.v ? "#fff" : DC.textSecondary,
                          }}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                    {kid.leaveParent !== "none" && (
                      <div className="flex items-center gap-2 pl-0.5">
                        <span className="text-xs shrink-0" style={{ color: DC.textSecondary }}>
                          {t(lang, "leaveExtensionYears")}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={kid.leaveExtensionYears}
                          onChange={(e) => {
                            const kids = [...draft.family.kids];
                            kids[kidIdx] = { ...kids[kidIdx], leaveExtensionYears: Math.max(0, Number(e.target.value)) };
                            setDraft({ ...draft, family: { ...draft.family, kids } });
                          }}
                          onBlur={() => commit(draft)}
                          className="h-7 w-16 text-sm text-right font-num"
                        />
                        <span className="text-xs" style={{ color: DC.textSecondary }}>
                          {t(lang, "leaveExtensionYearsUnit")}
                        </span>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {configTab === "income" && (
            <div className="flex flex-col gap-3">
              {(
                [
                  { key: "husband" as const, label: t(lang, "husbandIncome") },
                  { key: "wife" as const, label: t(lang, "wifeIncome") },
                ]
              ).map((row) => (
                <div key={row.key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold flex items-center gap-1" style={{ color: DC.textPrimary }}>
                    {row.label}
                    <HelpTip text={t(lang, "netIncomeHelp")} />
                  </span>
                  <div className="flex items-center gap-2 flex-wrap pl-1">
                    <span className="text-xs w-14 shrink-0" style={{ color: DC.textSecondary }}>
                      {t(lang, "netMonthly")}
                    </span>
                    <YenInput
                      value={draft.income[row.key].netMonthlyYen}
                      onChange={(n) =>
                        setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], netMonthlyYen: n } } })
                      }
                      onCommit={() => commit(draft)}
                      className="h-8 w-28 text-sm text-right font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {t(lang, "yenPerMonth")}
                    </span>
                    <Input
                      type="number"
                      value={draft.income[row.key].raisePercent}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          income: { ...draft.income, [row.key]: { ...draft.income[row.key], raisePercent: Number(e.target.value) } },
                        })
                      }
                      onBlur={() => commit(draft)}
                      className="h-8 w-16 text-sm text-right font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {t(lang, "raisePerYear")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pl-1">
                    <span className="text-xs w-14 shrink-0" style={{ color: DC.textSecondary }}>
                      {t(lang, "netBonus")}
                    </span>
                    <YenInput
                      value={draft.income[row.key].netBonusYen}
                      onChange={(n) =>
                        setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], netBonusYen: n } } })
                      }
                      onCommit={() => commit(draft)}
                      className="h-8 w-28 text-sm text-right font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {t(lang, "yenPerYear")}
                    </span>
                  </div>
                </div>
              ))}
              {/* 産休・育休は子どもに紐づく前提なので、家族タブの子ども行で設定する
                  (収入タブには置かない)。 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold" style={{ color: DC.textPrimary }}>
                  {t(lang, "sideIncome")}
                </span>
                <div className="flex items-center gap-2 flex-wrap pl-1">
                  <YenInput
                    value={draft.income.side.amountYen}
                    onChange={(n) => setDraft({ ...draft, income: { ...draft.income, side: { ...draft.income.side, amountYen: n } } })}
                    onCommit={() => commit(draft)}
                    className="h-8 w-28 text-sm text-right font-num"
                  />
                  <span className="text-xs" style={{ color: DC.textSecondary }}>
                    {t(lang, "yenPerMonth")}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap pl-1">
                  <span className="text-xs shrink-0" style={{ color: DC.textSecondary }}>
                    {t(lang, "sideIncomePeriod")}
                  </span>
                  <Select
                    value={draft.income.side.startYear === null ? "unset" : String(draft.income.side.startYear)}
                    onValueChange={(v) =>
                      commit({
                        ...draft,
                        income: { ...draft.income, side: { ...draft.income.side, startYear: v === "unset" ? null : Number(v) } },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">{t(lang, "unspecified")}</SelectItem>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs" style={{ color: DC.textSecondary }}>
                    {t(lang, "to")}
                  </span>
                  <Select
                    value={draft.income.side.endYear === null ? "unset" : String(draft.income.side.endYear)}
                    onValueChange={(v) =>
                      commit({
                        ...draft,
                        income: { ...draft.income, side: { ...draft.income.side, endYear: v === "unset" ? null : Number(v) } },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">{t(lang, "unspecified")}</SelectItem>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold" style={{ color: DC.textPrimary }}>
                  {t(lang, "publicAllowance")}
                </span>
                <span className="text-xs pl-1" style={{ color: DC.textSecondary }}>
                  {t(lang, "publicAllowanceDetail")}
                </span>
              </div>
              <div className="text-sm rounded-lg px-2.5 py-2" style={{ backgroundColor: DC.track, color: DC.textSecondary }}>
                {tf(lang, "grossAnnualNote", { amount: grossAnnualPreview })}
              </div>
            </div>
          )}

          {configTab === "spending" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
                {(
                  [
                    { k: "life" as const, l: t(lang, "life") },
                    { k: "education" as const, l: t(lang, "education") },
                    { k: "events" as const, l: t(lang, "events") },
                  ]
                ).map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => setSpendingSub(s.k)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      backgroundColor: spendingSub === s.k ? DC.primary : "transparent",
                      color: spendingSub === s.k ? "#fff" : DC.textPrimary,
                    }}
                  >
                    {s.l}
                  </button>
                ))}
              </div>

              {spendingSub === "life" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
                    {(
                      [
                        { k: "fixed" as const, l: t(lang, "fixed") },
                        { k: "variable" as const, l: t(lang, "variable") },
                      ]
                    ).map((s) => (
                      <button
                        key={s.k}
                        type="button"
                        onClick={() => setLifeSub(s.k)}
                        className="px-3 py-1 rounded-md text-sm font-semibold cursor-pointer"
                        style={{
                          backgroundColor: lifeSub === s.k ? DC.primary : "transparent",
                          color: lifeSub === s.k ? "#fff" : DC.textSecondary,
                        }}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs w-24 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                      {t(lang, "inflationRate")}
                      <HelpTip text={t(lang, "inflationHelp")} />
                    </span>
                    <Input
                      type="number"
                      value={draft.inflationRatePercent}
                      onChange={(e) => setDraft({ ...draft, inflationRatePercent: Number(e.target.value) })}
                      onBlur={() => commit(draft)}
                      className="h-8 w-16 text-xs text-right font-num"
                    />
                    <span className="text-xs" style={{ color: DC.textSecondary }}>
                      {t(lang, "inflationUnit")}
                    </span>
                  </div>

                  {draft.family.spouse && (
                    <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
                      {(
                        [
                          { k: "pre" as const, l: t(lang, "preCohabitation") },
                          { k: "post" as const, l: t(lang, "postCohabitation") },
                        ]
                      ).map((s) => (
                        <button
                          key={s.k}
                          type="button"
                          onClick={() => setLifePhase(s.k)}
                          className="px-3 py-1 rounded-md text-sm font-semibold cursor-pointer"
                          style={{
                            backgroundColor: lifePhase === s.k ? DC.cardBg : "transparent",
                            color: DC.textPrimary,
                          }}
                        >
                          {s.l}
                        </button>
                      ))}
                    </div>
                  )}

                  {draft.family.spouse && lifePhase === "pre" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(lifeSub === "fixed" ? draft.cohabitation.preFixed : draft.cohabitation.preVariable).map((item, itemIdx) => {
                        const listKey = lifeSub === "fixed" ? "preFixed" : "preVariable";
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 rounded-xl border py-3 px-3.5"
                            style={{ borderColor: DC.cardBorder, backgroundColor: DC.rowAltBg }}
                          >
                            <div
                              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: DC.track }}
                            >
                              <Receipt size={14} style={{ color: DC.textSecondary }} />
                            </div>
                            <Input
                              value={item.label}
                              onChange={(e) => {
                                const list = [...draft.cohabitation[listKey]];
                                list[itemIdx] = { ...list[itemIdx], label: e.target.value };
                                setDraft({ ...draft, cohabitation: { ...draft.cohabitation, [listKey]: list } });
                              }}
                              onBlur={() => commit(draft)}
                              className="h-8 text-sm flex-1 min-w-0"
                            />
                            <YenInput
                              value={item.monthlyYen}
                              onChange={(n) => {
                                const list = [...draft.cohabitation[listKey]];
                                list[itemIdx] = { ...list[itemIdx], monthlyYen: n };
                                setDraft({ ...draft, cohabitation: { ...draft.cohabitation, [listKey]: list } });
                              }}
                              onCommit={() => commit(draft)}
                              className="h-8 text-sm text-right w-24 shrink-0 font-num rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                commit({
                                  ...draft,
                                  cohabitation: {
                                    ...draft.cohabitation,
                                    [listKey]: draft.cohabitation[listKey].filter((_, ix) => ix !== itemIdx),
                                  },
                                })
                              }
                              className="p-1 rounded transition-all hover:bg-muted shrink-0"
                              style={{ color: DC.textFaint }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                      <div
                        className="flex items-center gap-2 rounded-xl border border-dashed py-3 px-3.5"
                        style={{ borderColor: DC.cardBorder }}
                      >
                        <Input
                          value={addLifeItemLabel}
                          onChange={(e) => setAddLifeItemLabel(e.target.value)}
                          placeholder={t(lang, "newLifeItemLabel")}
                          className="h-8 text-sm flex-1"
                        />
                        <YenInput
                          value={addLifeItemAmount === "" ? 0 : Number(addLifeItemAmount)}
                          onChange={(n) => setAddLifeItemAmount(n === 0 ? "" : String(n))}
                          className="h-8 text-sm w-24 text-right font-num"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!addLifeItemLabel.trim()) return;
                            const listKey = lifeSub === "fixed" ? "preFixed" : "preVariable";
                            const val = parseInt(addLifeItemAmount, 10);
                            commit({
                              ...draft,
                              cohabitation: {
                                ...draft.cohabitation,
                                [listKey]: [
                                  ...draft.cohabitation[listKey],
                                  { id: `li${Date.now()}`, label: addLifeItemLabel.trim(), monthlyYen: isNaN(val) ? 0 : val },
                                ],
                              },
                            });
                            setAddLifeItemLabel("");
                            setAddLifeItemAmount("");
                          }}
                        >
                          <Plus size={13} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(lifeSub === "fixed" ? fixedCats : variableCats).map((cat) => (
                        <CategoryBudgetCard
                          key={cat.id}
                          cat={cat}
                          displayCurrency={currency}
                          overrides={overridesByCategory.get(cat.id) ?? []}
                          onUpdate={onCategoryUpdate}
                          onScheduleOverride={onScheduleOverride}
                          onDeleteOverride={onDeleteOverride}
                          onDelete={onCategoryDelete}
                          lang={lang}
                        />
                      ))}

                      <div
                        className="flex items-center gap-2 rounded-xl border border-dashed py-3 px-3.5"
                        style={{ borderColor: DC.cardBorder }}
                      >
                        <Input
                          value={addCatName}
                          onChange={(e) => setAddCatName(e.target.value)}
                          placeholder={t(lang, "newCategoryName")}
                          className="h-8 text-sm flex-1"
                        />
                        <YenInput
                          value={addCatBudget === "" ? 0 : Number(addCatBudget)}
                          onChange={(n) => setAddCatBudget(n === 0 ? "" : String(n))}
                          className="h-8 text-sm w-24 text-right font-num"
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            const val = parseInt(addCatBudget, 10);
                            if (!addCatName.trim()) return;
                            await onCategoryAdd(addCatName.trim(), isNaN(val) ? 0 : val, lifeSub === "fixed");
                            setAddCatName("");
                            setAddCatBudget("");
                          }}
                        >
                          <Plus size={13} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {spendingSub === "education" && (
                <div className="flex flex-col gap-2.5">
                  {kidEducationMatrix}
                </div>
              )}

              {spendingSub === "events" && (
                <div className="flex flex-col gap-2">
                  {/* 結婚式・旅行は「よくあるイベント」として、クリックして追加するのではなく
                      最初から常設のフォームとして用意する。チェックボックスは1ステップ
                      余分になるので置かず、金額0円=未計上として扱う(compute.ts側もそう判定)。 */}
                  <div className="flex flex-col gap-1.5 rounded-lg border p-2.5" style={{ borderColor: DC.trackAlt }}>
                    <span className="text-sm font-semibold flex items-center gap-1" style={{ color: DC.textPrimary }}>
                      {t(lang, "eventPresetWedding")}
                      <HelpTip text={t(lang, "eventPresetWeddingHelp")} />
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Select
                        value={String(draft.wedding.year)}
                        onValueChange={(v) => commit({ ...draft, wedding: { ...draft.wedding, year: Number(v) } })}
                      >
                        <SelectTrigger className="h-8 text-sm w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_OPTIONS.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(draft.wedding.month)}
                        onValueChange={(v) => commit({ ...draft, wedding: { ...draft.wedding, month: Number(v) } })}
                      >
                        <SelectTrigger className="h-8 text-sm w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, m) => m + 1).map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {monthLabels[m - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <YenInput
                        value={draft.wedding.amountYen}
                        onChange={(n) => setDraft({ ...draft, wedding: { ...draft.wedding, amountYen: n } })}
                        onCommit={() => commit(draft)}
                        className="h-8 w-28 text-sm text-right font-num"
                      />
                      <span className="text-xs" style={{ color: DC.textSecondary }}>
                        {t(lang, "yenPerYear")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-lg border p-2.5" style={{ borderColor: DC.trackAlt }}>
                    <span className="text-sm font-semibold" style={{ color: DC.textPrimary }}>
                      {t(lang, "eventPresetTravel")}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: DC.textSecondary }}>
                        {t(lang, "travelStartYear")}
                      </span>
                      <Select
                        value={String(draft.travel.startYear)}
                        onValueChange={(v) => commit({ ...draft, travel: { ...draft.travel, startYear: Number(v) } })}
                      >
                        <SelectTrigger className="h-8 text-sm w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_OPTIONS.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <YenInput
                        value={draft.travel.amountYen}
                        onChange={(n) => setDraft({ ...draft, travel: { ...draft.travel, amountYen: n } })}
                        onCommit={() => commit(draft)}
                        className="h-8 w-28 text-sm text-right font-num"
                      />
                      <span className="text-xs" style={{ color: DC.textSecondary }}>
                        {t(lang, "yenPerYear")}
                      </span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {configTab === "savingsTab" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs w-28 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                  {t(lang, "returnRate")}
                  <HelpTip text={t(lang, "returnRateHelp")} />
                </span>
                <Input
                  type="number"
                  value={draft.savings.returnRatePercent}
                  onChange={(e) => setDraft({ ...draft, savings: { ...draft.savings, returnRatePercent: Number(e.target.value) } })}
                  onBlur={() => commit(draft)}
                  className="h-8 w-20 text-xs text-right font-num"
                />
                <span className="text-xs" style={{ color: DC.textSecondary }}>
                  {t(lang, "returnRateUnit")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-28" style={{ color: DC.textSecondary }}>
                  {t(lang, "investRatio")}
                </span>
                <Input
                  type="number"
                  value={draft.savings.investRatioPercent}
                  onChange={(e) => setDraft({ ...draft, savings: { ...draft.savings, investRatioPercent: Number(e.target.value) } })}
                  onBlur={() => commit(draft)}
                  className="h-8 w-20 text-xs text-right font-num"
                />
                <span className="text-xs" style={{ color: DC.textSecondary }}>
                  {t(lang, "investRatioUnit")}
                </span>
              </div>
            </div>
          )}

          <div className="mt-1 pt-3 border-t" style={{ borderColor: DC.trackAlt }}>
            {savePromptOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder={t(lang, "newScenarioPlaceholder")}
                  className="flex-1 h-8 text-xs"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!newScenarioName.trim()) return;
                    await onSaveAsNew(newScenarioName.trim(), draft);
                    setNewScenarioName("");
                    setSavePromptOpen(false);
                  }}
                >
                  {t(lang, "save")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSavePromptOpen(false)}>
                  {t(lang, "cancel")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                  {t(lang, "close")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSavePromptOpen(true)}>
                  {t(lang, "addScenario")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    commit(draft);
                    onOpenChange(false);
                  }}
                >
                  {t(lang, "apply")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
