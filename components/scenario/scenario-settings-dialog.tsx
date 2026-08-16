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
import { t, type Lang } from "@/lib/scenario/dictionary";
import type { Scenario, ScenarioConfig } from "@/lib/scenario/types";
import { HelpTip } from "./help-tip";

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => CUR_YEAR + i);

type ConfigTab = "family" | "income" | "spending" | "savingsTab";
type SpendingSub = "life" | "education" | "events";
type LifeSub = "fixed" | "variable";

function cloneConfig(config: ScenarioConfig): ScenarioConfig {
  return JSON.parse(JSON.stringify(config));
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

  const takeHomePreview = formatAmount(
    ((draft.income.husband.amountYen + (draft.family.spouse ? draft.income.wife.amountYen : 0)) * 0.8) / 1,
  );

  const tabs: { key: ConfigTab; label: string }[] = [
    { key: "family", label: t(lang, "family") },
    { key: "income", label: t(lang, "income") },
    { key: "spending", label: t(lang, "spending") },
    { key: "savingsTab", label: t(lang, "savingsTab") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderColor: "var(--color-border-default)" }}>
          <DialogTitle>
            {t(lang, "settingsBtn")} — {scenario.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[76vh] overflow-y-auto flex flex-col gap-3.5">
          {isCompare && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                編集対象:
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

          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--kg-track)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setConfigTab(tab.key)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
                style={{
                  backgroundColor: configTab === tab.key ? "var(--color-text-primary)" : "transparent",
                  color: configTab === tab.key ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {configTab === "family" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs w-24" style={{ color: "var(--color-text-secondary)" }}>
                  配偶者
                </span>
                <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: "var(--kg-track)" }}>
                  {[
                    { v: true, l: "あり" },
                    { v: false, l: "なし" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => commit({ ...draft, family: { ...draft.family, spouse: o.v } })}
                      className="px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        backgroundColor: draft.family.spouse === o.v ? "var(--color-primary)" : "transparent",
                        color: draft.family.spouse === o.v ? "#fff" : "var(--color-text-secondary)",
                      }}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  子ども
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
                  style={{ backgroundColor: "var(--kg-track)", color: "var(--color-text-secondary)" }}
                >
                  <Plus size={12} /> 子どもを追加
                </button>
              </div>

              {draft.family.kids.map((kid, kidIdx) => (
                <div key={kidIdx} className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                      生まれ年
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
                    <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      (今年{CUR_YEAR - kid.birthYear}歳)
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
                      style={{ color: "var(--color-text-subtle)" }}
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
                            style={{ color: "var(--color-text-secondary)" }}
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
                                  backgroundColor: sel === opt.key ? "var(--color-primary)" : "var(--color-surface-default)",
                                  color: sel === opt.key ? "#fff" : "var(--color-text-secondary)",
                                  borderColor: sel === opt.key ? "var(--color-primary)" : "var(--color-border-default)",
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
                  { key: "husband" as const, label: "本人年収" },
                  { key: "wife" as const, label: "配偶者年収" },
                ]
              ).map((row) => (
                <div key={row.key} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs w-24" style={{ color: "var(--color-text-secondary)" }}>
                    {row.label}
                  </span>
                  <Input
                    type="number"
                    value={draft.income[row.key].amountYen}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        income: { ...draft.income, [row.key]: { ...draft.income[row.key], amountYen: Number(e.target.value) } },
                      })
                    }
                    onBlur={() => commit(draft)}
                    className="h-8 w-28 text-xs text-right font-num"
                  />
                  <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                    円/月
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
                  <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                    %/年 昇給
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-xs w-24" style={{ color: "var(--color-text-secondary)" }}>
                  副業収入
                </span>
                <Input
                  type="number"
                  value={draft.income.side.amountYen}
                  onChange={(e) => setDraft({ ...draft, income: { ...draft.income, side: { amountYen: Number(e.target.value) } } })}
                  onBlur={() => commit(draft)}
                  className="h-8 w-28 text-xs text-right font-num"
                />
                <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  円/月
                </span>
              </div>
              <div className="text-xs rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--kg-track)", color: "var(--color-text-secondary)" }}>
                手取り目安(自動計算): {takeHomePreview}/月 · 児童手当は自動加算されます
              </div>
            </div>
          )}

          {configTab === "spending" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: "var(--kg-track)" }}>
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
                    className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: spendingSub === s.k ? "var(--color-surface-default)" : "transparent",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {s.l}
                  </button>
                ))}
              </div>

              {spendingSub === "life" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: "var(--kg-track)" }}>
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
                          backgroundColor: lifeSub === s.k ? "var(--color-primary)" : "transparent",
                          color: lifeSub === s.k ? "#fff" : "var(--color-text-secondary)",
                        }}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs w-24 flex items-center gap-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      インフレ率
                      <HelpTip text="家賃分の目安: 過去30年平均 約0.5%/年、都心部は1〜2%の上昇も。生活費分の目安: 過去30年平均 約0.5%/年、長期は1〜2%で設計するのが無難。" />
                    </span>
                    <Input
                      type="number"
                      value={draft.inflationRatePercent}
                      onChange={(e) => setDraft({ ...draft, inflationRatePercent: Number(e.target.value) })}
                      onBlur={() => commit(draft)}
                      className="h-8 w-16 text-xs text-right font-num"
                    />
                    <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                      %/年(暮らし全体)
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
                    />
                  ))}

                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-2" style={{ borderColor: "var(--color-border-default)" }}>
                    <Input
                      value={addCatName}
                      onChange={(e) => setAddCatName(e.target.value)}
                      placeholder="New category name"
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={addCatBudget}
                      onChange={(e) => setAddCatBudget(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={`Budget (${currency})`}
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
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  教育費は「家族」タブで子どもごとに進路を選ぶと自動計算されます。
                </p>
              )}

              {spendingSub === "events" && (
                <div className="flex flex-col gap-2">
                  {draft.events.map((ev, i) => (
                    <div key={ev.id} className="flex items-center gap-1.5 flex-wrap rounded-lg border p-2" style={{ borderColor: "var(--color-border-subtle)" }}>
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
                      <Input
                        type="number"
                        value={ev.amountYen}
                        onChange={(e) => {
                          const events = [...draft.events];
                          events[i] = { ...events[i], amountYen: Number(e.target.value) };
                          setDraft({ ...draft, events });
                        }}
                        onBlur={() => commit(draft)}
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
                        <SelectTrigger className="h-8 text-xs w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, m) => m + 1).map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m}月
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => commit({ ...draft, events: draft.events.filter((_, ix) => ix !== i) })}
                        className="p-1 rounded transition-all hover:bg-muted"
                        style={{ color: "var(--color-text-subtle)" }}
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
                        events: [...draft.events, { id: `e${Date.now()}`, label: "新規イベント", year: CUR_YEAR, month: 1, amountYen: 100000 }],
                      })
                    }
                    className="flex items-center gap-1.5 justify-center px-3 py-2 rounded-lg border border-dashed text-xs font-semibold cursor-pointer"
                    style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-subtle)" }}
                  >
                    <Plus size={13} /> イベントを追加
                  </button>
                </div>
              )}
            </div>
          )}

          {configTab === "savingsTab" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs w-28 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                  想定利率
                  <HelpTip text="世界株式インデックス長期平均: 5〜7%。国内株式: 3〜5%。債券: 1〜3%。保守的には2〜3%。非課税枠(NISA等)を活かすなら株式型(4〜7%)、生涯投資枠1,800万円を長期で埋めていく戦略が有効。" />
                </span>
                <Input
                  type="number"
                  value={draft.savings.returnRatePercent}
                  onChange={(e) => setDraft({ ...draft, savings: { ...draft.savings, returnRatePercent: Number(e.target.value) } })}
                  onBlur={() => commit(draft)}
                  className="h-8 w-20 text-xs text-right font-num"
                />
                <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  %/年
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-28" style={{ color: "var(--color-text-secondary)" }}>
                  投資に回す比率
                </span>
                <Input
                  type="number"
                  value={draft.savings.investRatioPercent}
                  onChange={(e) => setDraft({ ...draft, savings: { ...draft.savings, investRatioPercent: Number(e.target.value) } })}
                  onBlur={() => commit(draft)}
                  className="h-8 w-20 text-xs text-right font-num"
                />
                <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                  % (毎月の黒字額に対して)
                </span>
              </div>
            </div>
          )}

          <div className="mt-1 pt-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            {savePromptOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="新しいシナリオ名を入力…"
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
                <span className="text-[11px] flex-1" style={{ color: "var(--color-text-subtle)" }}>
                  この条件のまま確認するだけなら閉じるでOK。別条件として残したい場合は保存。
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
