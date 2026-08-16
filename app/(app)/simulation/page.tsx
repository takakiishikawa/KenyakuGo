"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListTree, Settings2 } from "lucide-react";
import { Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, toast } from "@takaki/go-design-system";
import { formatJPY, formatVND } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import type { CategoryBudgetOverride } from "@/lib/category-budget";
import type { CategoryForCard } from "@/components/category-budget-card";
import { ScenarioTable } from "@/components/scenario/scenario-table";
import { ScenarioChart } from "@/components/scenario/scenario-chart";
import { ScenarioSettingsDialog } from "@/components/scenario/scenario-settings-dialog";
import { ScenarioListDialog } from "@/components/scenario/scenario-list-dialog";
import {
  computeScenarioYears,
  expandMonthly,
  toRows,
  SIMULATION_YEARS_AHEAD,
  type ScenarioRow,
} from "@/lib/scenario/compute";
import { buildChartSeries, buildCompareChartSeries, chartKindLabel, CHART_KINDS, type ChartKind } from "@/lib/scenario/chart";
import { buildSingleTableRows, buildCompareTableRows } from "@/lib/scenario/table-rows";
import { t } from "@/lib/scenario/dictionary";
import type { Scenario, ScenarioConfig } from "@/lib/scenario/types";
import type { DisplayCurrency } from "@/components/currency-switch";

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: SIMULATION_YEARS_AHEAD + 1 }, (_, i) => CUR_YEAR + i);

function formatYen(yen: number, currency: DisplayCurrency, vndPerJpy: number): string {
  return currency === "JPY" ? formatJPY(yen) : formatVND(yen * vndPerJpy);
}

export default function SimulationPage() {
  const { lang, currency } = usePreferences();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [vndPerJpy, setVndPerJpy] = useState(162);
  const [categories, setCategories] = useState<CategoryForCard[]>([]);
  const [overrides, setOverrides] = useState<CategoryBudgetOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const [compareMode, setCompareMode] = useState<"single" | "compare">("single");
  const [timeMode, setTimeMode] = useState<"yearly" | "monthly">("yearly");
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [focusYear, setFocusYear] = useState(CUR_YEAR);
  const [chartKind, setChartKind] = useState<ChartKind>("overview");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandAllFlag, setExpandAllFlag] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [scenarioListOpen, setScenarioListOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    const r = await fetch("/api/scenarios");
    if (!r.ok) return;
    const { scenarios: list, vndPerJpy: rate } = (await r.json()) as { scenarios: Scenario[]; vndPerJpy: number };
    setScenarios(list);
    setVndPerJpy(rate);
  }, []);

  const fetchCategories = useCallback(async () => {
    const [catsRes, overridesRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/categories/overrides"),
    ]);
    if (catsRes.ok) setCategories(await catsRes.json());
    if (overridesRes.ok) setOverrides(await overridesRes.json());
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchScenarios(), fetchCategories()]);
      setLoading(false);
    })();
  }, [fetchScenarios, fetchCategories]);

  const primary = useMemo(
    () => scenarios.find((s) => s.is_primary) ?? scenarios[0],
    [scenarios],
  );
  const editTarget = useMemo(
    () => scenarios.find((s) => s.id === (editTargetId ?? primary?.id)) ?? primary,
    [scenarios, editTargetId, primary],
  );

  const isExpanded = useCallback(
    (key: string) => (expandedRows[key] !== undefined ? expandedRows[key] : expandAllFlag),
    [expandedRows, expandAllFlag],
  );
  const toggleRow = useCallback(
    (key: string) => setExpandedRows((prev) => ({ ...prev, [key]: !isExpanded(key) })),
    [isExpanded],
  );
  const toggleExpandAll = useCallback(() => {
    setExpandAllFlag((f) => !f);
    setExpandedRows({});
  }, []);

  const primaryYearRows = useMemo(
    () => (primary ? computeScenarioYears(primary.config, categories, overrides, vndPerJpy) : []),
    [primary, categories, overrides, vndPerJpy],
  );
  const rowsForView: ScenarioRow[] = useMemo(() => {
    if (!primary) return [];
    return timeMode === "yearly" ? toRows(primaryYearRows) : expandMonthly(primaryYearRows, primary.config, focusYear);
  }, [primary, primaryYearRows, timeMode, focusYear]);

  const compareRows = useMemo(() => {
    return scenarios.map((s) => {
      const yearRows = computeScenarioYears(s.config, categories, overrides, vndPerJpy);
      const rows = timeMode === "yearly" ? toRows(yearRows) : expandMonthly(yearRows, s.config, focusYear);
      return { id: s.id, name: s.name, rows };
    });
  }, [scenarios, categories, overrides, vndPerJpy, timeMode, focusYear]);

  const formatAmount = useCallback((yen: number) => formatYen(yen, currency, vndPerJpy), [currency, vndPerJpy]);

  const singleTableRows = useMemo(
    () => buildSingleTableRows(rowsForView, lang, isExpanded, formatAmount),
    [rowsForView, lang, isExpanded, formatAmount],
  );
  const compareTableRows = useMemo(
    () => buildCompareTableRows(compareRows, lang, isExpanded, formatAmount),
    [compareRows, lang, isExpanded, formatAmount],
  );

  const chartBundle = useMemo(() => {
    if (compareMode === "compare") return buildCompareChartSeries(compareRows);
    return buildChartSeries(rowsForView, chartKind, lang);
  }, [compareMode, compareRows, rowsForView, chartKind, lang]);

  const lastYear = primaryYearRows[primaryYearRows.length - 1];
  const curYearRow = primaryYearRows.find((y) => y.year === CUR_YEAR) ?? primaryYearRows[0];
  const simTargetPct =
    lastYear && curYearRow
      ? Math.max(0, Math.min(100, Math.round((curYearRow.savingsCumTotalYen / (lastYear.savingsCumTotalYen || 1)) * 100)))
      : 0;

  // --- シナリオCRUD ---
  const setPrimaryScenario = async (id: string) => {
    setScenarios((prev) => prev.map((s) => ({ ...s, is_primary: s.id === id })));
    await fetch(`/api/scenarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
  };

  const deleteScenario = async (id: string) => {
    if (scenarios.length <= 1) return;
    const res = await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchScenarios();
      if (editTargetId === id) setEditTargetId(null);
    }
  };

  const saveConfig = useCallback(async (scenarioId: string, config: ScenarioConfig) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, config } : s)));
    await fetch(`/api/scenarios/${scenarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
  }, []);

  const saveAsNew = useCallback(async (name: string, config: ScenarioConfig) => {
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, config }),
    });
    if (res.ok) {
      const created = (await res.json()) as Scenario;
      setScenarios((prev) => [...prev, created]);
      toast.success(`Saved "${name}"`);
    }
  }, []);

  // --- カテゴリ(暮らし)CRUD ---
  const onCategoryUpdate = useCallback(
    async (
      id: string,
      patch: Partial<Pick<CategoryForCard, "name" | "budget" | "is_fixed" | "renewal_cycle_years" | "renewal_fee_months">>,
    ) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [],
  );

  const onCategoryAdd = useCallback(
    async (name: string, budget: number, isFixed: boolean) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budget, is_fixed: isFixed }),
      });
      if (res.ok) await fetchCategories();
      else toast.error("Could not add category");
    },
    [fetchCategories],
  );

  const onCategoryDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      await fetchCategories();
    },
    [fetchCategories],
  );

  const onScheduleOverride = useCallback(
    async (categoryId: string, month: string, endMonth: string | null, budget: number) => {
      await fetch(`/api/categories/${categoryId}/overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, end_month: endMonth, budget }),
      });
      await fetchCategories();
    },
    [fetchCategories],
  );

  const onDeleteOverride = useCallback(
    async (categoryId: string, overrideId: string) => {
      await fetch(`/api/categories/${categoryId}/overrides/${overrideId}`, { method: "DELETE" });
      await fetchCategories();
    },
    [fetchCategories],
  );

  if (loading || !primary || !editTarget) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const isSingle = compareMode === "single";
  const isTableView = viewMode === "table";

  return (
    <div className="mt-6 flex flex-col gap-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedControl
            value={compareMode}
            onChange={(v) => setCompareMode(v as "single" | "compare")}
            options={[
              { value: "single", label: t(lang, "single") },
              { value: "compare", label: t(lang, "compare") },
            ]}
          />
          <SegmentedControl
            value={timeMode}
            onChange={(v) => setTimeMode(v as "yearly" | "monthly")}
            options={[
              { value: "yearly", label: t(lang, "yearly") },
              { value: "monthly", label: t(lang, "monthly") },
            ]}
          />
          {timeMode === "monthly" && (
            <Select value={String(focusYear)} onValueChange={(v) => setFocusYear(Number(v))}>
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
          )}
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={viewMode}
            onChange={(v) => setViewMode(v as "table" | "graph")}
            options={[
              { value: "table", label: t(lang, "table") },
              { value: "graph", label: t(lang, "graph") },
            ]}
          />
          <IconButton title="シナリオ管理" onClick={() => setScenarioListOpen(true)}>
            <ListTree size={14} />
          </IconButton>
          {isSingle && (
            <IconButton title="シミュレーション設定" onClick={() => setEditorOpen(true)} accent>
              <Settings2 size={14} />
            </IconButton>
          )}
        </div>
      </div>

      {isSingle && lastYear && curYearRow && (
        <Card
          className="rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--color-text-subtle)" }}>
            {t(lang, "totalSavings")}
          </span>
          <span className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {formatAmount(lastYear.savingsCumTotalYen)}
          </span>
          <div className="flex-1 min-w-20 h-1.5 rounded-full" style={{ backgroundColor: "var(--kg-track)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${simTargetPct}%`, backgroundColor: "var(--color-primary)" }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
            {CUR_YEAR}年時点 {formatAmount(curYearRow.savingsCumTotalYen)} / {YEAR_OPTIONS[YEAR_OPTIONS.length - 1]}年見込み{" "}
            {formatAmount(lastYear.savingsCumTotalYen)}
          </span>
        </Card>
      )}

      {isTableView ? (
        <ScenarioTable
          rows={isSingle ? singleTableRows : compareTableRows}
          columnLabels={rowsForView.map((r) => r.yearLabel)}
          firstColumnLabel={isSingle ? primary.name : ""}
          expandAll={expandAllFlag}
          onToggleExpandAll={toggleExpandAll}
          onToggleRow={toggleRow}
          lang={lang}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {isSingle && (
            <div className="flex flex-wrap gap-1.5">
              {CHART_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChartKind(k)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all"
                  style={{
                    backgroundColor: chartKind === k ? "var(--color-text-primary)" : "var(--color-surface-default)",
                    color: chartKind === k ? "#fff" : "var(--color-text-secondary)",
                    borderColor: "var(--color-border-default)",
                  }}
                >
                  {chartKindLabel(lang, k)}
                </button>
              ))}
            </div>
          )}
          <Card className="rounded-2xl p-5" style={{ borderColor: "var(--color-border-default)" }}>
            <ScenarioChart bundle={chartBundle} formatAmount={formatAmount} />
          </Card>
        </div>
      )}

      <ScenarioSettingsDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        scenario={editTarget}
        isCompare={!isSingle}
        scenarios={scenarios}
        editTargetId={editTarget.id}
        onEditTargetChange={setEditTargetId}
        categories={categories}
        overrides={overrides}
        onConfigChange={saveConfig}
        onSaveAsNew={saveAsNew}
        onCategoryUpdate={onCategoryUpdate}
        onCategoryAdd={onCategoryAdd}
        onCategoryDelete={onCategoryDelete}
        onScheduleOverride={onScheduleOverride}
        onDeleteOverride={onDeleteOverride}
        lang={lang}
        currency={currency}
      />

      <ScenarioListDialog
        open={scenarioListOpen}
        onOpenChange={setScenarioListOpen}
        scenarios={scenarios}
        onSelect={setPrimaryScenario}
        onDelete={deleteScenario}
        lang={lang}
      />
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: "var(--kg-track)" }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: value === o.value ? "var(--color-surface-default)" : "transparent",
            color: "var(--color-text-primary)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  accent,
  children,
}: {
  title: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center justify-center h-8 w-8 rounded-lg cursor-pointer transition-all hover:brightness-95 active:scale-95"
      style={{
        backgroundColor: accent ? "var(--color-primary)" : "var(--kg-track)",
        color: accent ? "#fff" : "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
