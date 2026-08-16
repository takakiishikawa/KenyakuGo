"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
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
import { makeFormatAmount } from "@/lib/currency";
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
}) {
  const [configTab, setConfigTab] = useState<ConfigTab>("family");
  const [spendingSub, setSpendingSub] = useState<SpendingSub>("life");
  const [lifeSub, setLifeSub] = useState<LifeSub>("fixed");
  const [draft, setDraft] = useState<ScenarioConfig>(() => cloneConfig(scenario.config));
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [addCatName, setAddCatName] = useState("");
  const [addCatBudget, setAddCatBudget] = useState("");

  useEffect(() => {
    setDraft(cloneConfig(scenario.config));
  }, [scenario.id, scenario.config]);

  const formatAmount = makeFormatAmount(currency);
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
  const grossAnnualPreview = formatAmount(grossAnnualYen);

  const monthLabels = lang === "ja" ? MONTH_LABELS_JA : MONTH_LABELS_EN;

  const tabs: { key: ConfigTab; label: string }[] = [
    { key: "family", label: t(lang, "family") },
    { key: "income", label: t(lang, "income") },
    { key: "spending", label: t(lang, "spending") },
    { key: "savingsTab", label: t(lang, "savingsTab") },
  ];

  // 「家族」タブと「支出→教育」タブの両方から同じ子ども×ステージのマトリクスを
  // 参照できるようにする(教育タブを押しても何も出ない、という問題への対応)。
  const kidEducationMatrix = (
    <div className="flex flex-col gap-2.5">
      {draft.family.kids.length === 0 ? (
        <p className="text-xs" style={{ color: DC.textFaint }}>
          {t(lang, "children")}: 0
        </p>
      ) : (
        draft.family.kids.map((kid, kidIdx) => (
          <div key={kidIdx} className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: DC.trackAlt }}>
            <div className="text-xs font-semibold" style={{ color: DC.textPrimary }}>
              {t(lang, "children")} {kidIdx + 1}{" "}
              <span className="font-normal" style={{ color: DC.textFaint }}>
                ({kid.birthYear} · {tf(lang, "ageThisYear", { age: CUR_YEAR - kid.birthYear })})
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {EDU_STAGES.map((stage) => {
                const kidEdu = draft.education[String(kidIdx)] ?? {};
                const sel = kidEdu[stage.key] ?? "public";
                return (
                  <div key={stage.key} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] w-24 shrink-0 flex items-center gap-1" style={{ color: DC.textSecondary }}>
                      {lang === "ja" ? stage.labelJa : stage.labelEn}
                      <HelpTip text={lang === "ja" ? stage.tipJa : stage.tipEn} />
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {stage.options.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            const education = { ...draft.education };
                            education[String(kidIdx)] = { ...(education[String(kidIdx)] ?? {}), [stage.key]: opt.key };
                            commit({ ...draft, education });
                          }}
                          className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer transition-all border"
                          style={{
                            backgroundColor: sel === opt.key ? DC.primary : DC.cardBg,
                            color: sel === opt.key ? "#fff" : DC.textSecondary,
                            borderColor: sel === opt.key ? DC.primary : DC.cardBorder,
                          }}
                        >
                          {lang === "ja" ? opt.labelJa : opt.labelEn}
                        </button>
                      ))}
                    </div>
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>
            {t(lang, "settingsBtn")} — {scenario.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[76vh] overflow-y-auto flex flex-col gap-3.5">
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

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: DC.textSecondary }}>
                  {t(lang, "children")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    commit({
                      ...draft,
                      family: { ...draft.family, kids: [...draft.family.kids, { birthYear: CUR_YEAR }] },
                    })
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all hover:brightness-95"
                  style={{ backgroundColor: DC.track, color: DC.textSecondary }}
                >
                  <Plus size={12} /> {t(lang, "addChild")}
                </button>
              </div>

              {draft.family.kids.map((kid, kidIdx) => (
                <div key={kidIdx} className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: DC.trackAlt }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: DC.textFaint }}>
                      {t(lang, "birthYear")}
                    </span>
                    <Input
                      type="number"
                      value={kid.birthYear}
                      onChange={(e) => {
                        const kids = [...draft.family.kids];
                        kids[kidIdx] = { birthYear: Number(e.target.value) };
                        commit({ ...draft, family: { ...draft.family, kids } });
                      }}
                      className="h-7 w-20 text-xs font-num"
                    />
                    <span className="text-[11px]" style={{ color: DC.textFaint }}>
                      {tf(lang, "ageThisYear", { age: CUR_YEAR - kid.birthYear })}
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
                      style={{ color: DC.textFaint }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {EDU_STAGES.map((stage) => {
                      const kidEdu = draft.education[String(kidIdx)] ?? {};
                      const sel = kidEdu[stage.key] ?? "public";
                      return (
                        <div key={stage.key} className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[11px] w-24 shrink-0 flex items-center gap-1"
                            style={{ color: DC.textSecondary }}
                          >
                            {lang === "ja" ? stage.labelJa : stage.labelEn}
                            <HelpTip text={lang === "ja" ? stage.tipJa : stage.tipEn} />
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {stage.options.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  const education = { ...draft.education };
                                  education[String(kidIdx)] = { ...(education[String(kidIdx)] ?? {}), [stage.key]: opt.key };
                                  commit({ ...draft, education });
                                }}
                                className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold cursor-pointer transition-all border"
                                style={{
                                  backgroundColor: sel === opt.key ? DC.primary : DC.cardBg,
                                  color: sel === opt.key ? "#fff" : DC.textSecondary,
                                  borderColor: sel === opt.key ? DC.primary : DC.cardBorder,
                                }}
                              >
                                {lang === "ja" ? opt.labelJa : opt.labelEn}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: DC.textPrimary }}>
                    {row.label}
                    <HelpTip text={t(lang, "netIncomeHelp")} />
                  </span>
                  <div className="flex items-center gap-2 flex-wrap pl-1">
                    <span className="text-[11px] w-14 shrink-0" style={{ color: DC.textFaint }}>
                      {t(lang, "netMonthly")}
                    </span>
                    <YenInput
                      value={draft.income[row.key].netMonthlyYen}
                      onChange={(n) =>
                        setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], netMonthlyYen: n } } })
                      }
                      onCommit={() => commit(draft)}
                      className="h-8 w-28 text-xs text-right font-num"
                    />
                    <span className="text-[11px]" style={{ color: DC.textFaint }}>
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
                      className="h-8 w-16 text-xs text-right font-num"
                    />
                    <span className="text-[11px]" style={{ color: DC.textFaint }}>
                      {t(lang, "raisePerYear")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pl-1">
                    <span className="text-[11px] w-14 shrink-0" style={{ color: DC.textFaint }}>
                      {t(lang, "netBonus")}
                    </span>
                    <YenInput
                      value={draft.income[row.key].netBonusYen}
                      onChange={(n) =>
                        setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], netBonusYen: n } } })
                      }
                      onCommit={() => commit(draft)}
                      className="h-8 w-28 text-xs text-right font-num"
                    />
                    <span className="text-[11px]" style={{ color: DC.textFaint }}>
                      {t(lang, "yenPerYear")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 pl-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color: DC.textSecondary }}>
                        {t(lang, "parentalLeave")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          commit({
                            ...draft,
                            income: {
                              ...draft.income,
                              [row.key]: {
                                ...draft.income[row.key],
                                leavePeriods: [
                                  ...draft.income[row.key].leavePeriods,
                                  { id: `lv${Date.now()}`, fromYear: CUR_YEAR, fromMonth: 1, toYear: CUR_YEAR, toMonth: 6, incomePercent: 0 },
                                ],
                              },
                            },
                          })
                        }
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer transition-all hover:brightness-95"
                        style={{ backgroundColor: DC.track, color: DC.textSecondary }}
                      >
                        <Plus size={10} /> {t(lang, "addLeavePeriod")}
                      </button>
                    </div>
                    {draft.income[row.key].leavePeriods.length === 0 ? (
                      <span className="text-[11px]" style={{ color: DC.textFaint }}>
                        {t(lang, "leaveNoPeriods")}
                      </span>
                    ) : (
                      draft.income[row.key].leavePeriods.map((lp, lvIdx) => (
                        <div key={lp.id} className="flex items-center gap-1.5 flex-wrap rounded-lg border p-1.5" style={{ borderColor: DC.trackAlt }}>
                          {(
                            [
                              { field: "fromYear" as const, w: "w-16" },
                              { field: "fromMonth" as const, w: "w-12" },
                            ]
                          ).map(({ field, w }) => (
                            <Input
                              key={field}
                              type="number"
                              value={lp[field]}
                              onChange={(e) => {
                                const leavePeriods = [...draft.income[row.key].leavePeriods];
                                leavePeriods[lvIdx] = { ...leavePeriods[lvIdx], [field]: Number(e.target.value) };
                                setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], leavePeriods } } });
                              }}
                              onBlur={() => commit(draft)}
                              className={`h-7 ${w} text-[11px] text-right font-num`}
                            />
                          ))}
                          <span className="text-[10.5px]" style={{ color: DC.textFaint }}>
                            {t(lang, "to")}
                          </span>
                          {(
                            [
                              { field: "toYear" as const, w: "w-16" },
                              { field: "toMonth" as const, w: "w-12" },
                            ]
                          ).map(({ field, w }) => (
                            <Input
                              key={field}
                              type="number"
                              value={lp[field]}
                              onChange={(e) => {
                                const leavePeriods = [...draft.income[row.key].leavePeriods];
                                leavePeriods[lvIdx] = { ...leavePeriods[lvIdx], [field]: Number(e.target.value) };
                                setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], leavePeriods } } });
                              }}
                              onBlur={() => commit(draft)}
                              className={`h-7 ${w} text-[11px] text-right font-num`}
                            />
                          ))}
                          <span className="text-[10.5px] shrink-0" style={{ color: DC.textFaint }}>
                            {t(lang, "leaveIncomePercent")}
                          </span>
                          <Input
                            type="number"
                            value={lp.incomePercent}
                            onChange={(e) => {
                              const leavePeriods = [...draft.income[row.key].leavePeriods];
                              leavePeriods[lvIdx] = { ...leavePeriods[lvIdx], incomePercent: Number(e.target.value) };
                              setDraft({ ...draft, income: { ...draft.income, [row.key]: { ...draft.income[row.key], leavePeriods } } });
                            }}
                            onBlur={() => commit(draft)}
                            className="h-7 w-14 text-[11px] text-right font-num"
                          />
                          <span className="text-[10.5px]" style={{ color: DC.textFaint }}>
                            %
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              commit({
                                ...draft,
                                income: {
                                  ...draft.income,
                                  [row.key]: {
                                    ...draft.income[row.key],
                                    leavePeriods: draft.income[row.key].leavePeriods.filter((_, ix) => ix !== lvIdx),
                                  },
                                },
                              })
                            }
                            className="p-1 rounded transition-all hover:bg-muted ml-auto"
                            style={{ color: DC.textFaint }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-xs w-24" style={{ color: DC.textSecondary }}>
                  {t(lang, "sideIncome")}
                </span>
                <YenInput
                  value={draft.income.side.amountYen}
                  onChange={(n) => setDraft({ ...draft, income: { ...draft.income, side: { amountYen: n } } })}
                  onCommit={() => commit(draft)}
                  className="h-8 w-28 text-xs text-right font-num"
                />
                <span className="text-[11px]" style={{ color: DC.textFaint }}>
                  {t(lang, "yenPerMonth")}
                </span>
              </div>
              <div className="text-xs rounded-lg px-2.5 py-2" style={{ backgroundColor: DC.track, color: DC.textSecondary }}>
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
                        className="px-3 py-1 rounded-md text-[11.5px] font-semibold cursor-pointer"
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
                    <span className="text-[11px]" style={{ color: DC.textFaint }}>
                      {t(lang, "inflationUnit")}
                    </span>
                  </div>

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

                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-2" style={{ borderColor: DC.cardBorder }}>
                    <Input
                      value={addCatName}
                      onChange={(e) => setAddCatName(e.target.value)}
                      placeholder={t(lang, "newCategoryName")}
                      className="h-8 text-xs flex-1"
                    />
                    <YenInput
                      value={addCatBudget === "" ? 0 : Number(addCatBudget)}
                      onChange={(n) => setAddCatBudget(n === 0 ? "" : String(n))}
                      className="h-8 text-xs w-32 text-right font-num"
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

              {spendingSub === "education" && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs" style={{ color: DC.textSecondary }}>
                    {t(lang, "selectEducationHint")}
                  </p>
                  {kidEducationMatrix}
                </div>
              )}

              {spendingSub === "events" && (
                <div className="flex flex-col gap-2">
                  {draft.events.map((ev, i) => (
                    <div key={ev.id} className="flex items-center gap-1.5 flex-wrap rounded-lg border p-2" style={{ borderColor: DC.trackAlt }}>
                      <Input
                        value={ev.label}
                        onChange={(e) => {
                          const events = [...draft.events];
                          events[i] = { ...events[i], label: e.target.value };
                          setDraft({ ...draft, events });
                        }}
                        onBlur={() => commit(draft)}
                        className="h-8 text-xs flex-1 min-w-24"
                      />
                      <YenInput
                        value={ev.amountYen}
                        onChange={(n) => {
                          const events = [...draft.events];
                          events[i] = { ...events[i], amountYen: n };
                          setDraft({ ...draft, events });
                        }}
                        onCommit={() => commit(draft)}
                        className="h-8 w-28 text-xs text-right font-num"
                      />
                      <Select
                        value={String(ev.year)}
                        onValueChange={(v) => {
                          const events = [...draft.events];
                          events[i] = { ...events[i], year: Number(v) };
                          commit({ ...draft, events });
                        }}
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
                      <Select
                        value={String(ev.month)}
                        onValueChange={(v) => {
                          const events = [...draft.events];
                          events[i] = { ...events[i], month: Number(v) };
                          commit({ ...draft, events });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-20">
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
                      <button
                        type="button"
                        onClick={() => commit({ ...draft, events: draft.events.filter((_, ix) => ix !== i) })}
                        className="p-1 rounded transition-all hover:bg-muted"
                        style={{ color: DC.textFaint }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      commit({
                        ...draft,
                        events: [
                          ...draft.events,
                          { id: `e${Date.now()}`, label: t(lang, "newEventLabel"), year: CUR_YEAR, month: 1, amountYen: 100000 },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 justify-center px-3 py-2 rounded-lg border border-dashed text-xs font-semibold cursor-pointer"
                    style={{ borderColor: DC.cardBorder, color: DC.textFaint }}
                  >
                    <Plus size={13} /> {t(lang, "addEvent")}
                  </button>
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
                <span className="text-[11px]" style={{ color: DC.textFaint }}>
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
                <span className="text-[11px]" style={{ color: DC.textFaint }}>
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
              <div className="flex items-center justify-end gap-2">
                <span className="text-[11px] flex-1" style={{ color: DC.textFaint }}>
                  {t(lang, "saveHint")}
                </span>
                <Button size="sm" onClick={() => setSavePromptOpen(true)}>
                  {t(lang, "addScenario")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
