"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { MonthRecord } from "@/app/api/dam/route";
import { Card, PageHeader } from "@takaki/go-design-system";

interface DamData {
  targetMonthly: number;
  fixedCosts: number;
  thisMonthTotal: number;
  projectedMonthTotal: number;
  currentBalance: number;
  achievementRate: number;
  cumulativeBalance: number;
  damLevel: number;
  months: MonthRecord[];
  categoryBreakdown: Record<string, number>;
  damStartLabel: string;
}

export default function DamPage() {
  const [data, setData] = useState<DamData | null>(null);

  useEffect(() => {
    fetch("/api/dam").then(async (r) => {
      if (!r.ok) return;
      const json: DamData = await r.json();
      setData(json);
    });
  }, []);

  const currentMonth = data?.months[data.months.length - 1];

  // 月別履歴の合計（最上行に表示）
  const totals = data
    ? data.months.reduce(
        (acc, m) => ({
          target: acc.target + m.target,
          projected: acc.projected + m.projected,
          balance: acc.balance + m.balance,
        }),
        { target: 0, projected: 0, balance: 0 },
      )
    : null;
  const totalCumulative = currentMonth?.cumulative ?? 0;

  return (
    <div>
      <PageHeader
        title="ダム"
        actions={
          data && (
            <p className="text-xs text-muted-foreground">
              {data.damStartLabel}〜 · 予算 {formatVND(data.targetMonthly)}/月
            </p>
          )
        }
      />

      {data && data.months.length > 0 && totals && (
        <Card className="mt-8 animate-fade-up">
          <div
            className="px-7 py-5 border-b"
            style={{ borderColor: "var(--kg-border-subtle)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              月別倹約履歴
            </p>
          </div>
          <div
            className="grid px-7 py-3 text-xs font-medium uppercase tracking-wider border-b text-muted-foreground"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
              borderColor: "var(--kg-border-subtle)",
              backgroundColor: "var(--kg-surface-2)",
            }}
          >
            <span>月</span>
            <span className="text-right">予算</span>
            <span className="text-right">月末予測</span>
            <span className="text-right">倹約額</span>
            <span className="text-right">累計</span>
          </div>

          {/* 合計行（最上行） */}
          <div
            className="grid items-center px-7 py-4 border-b font-semibold"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
              borderColor: "var(--kg-border-medium)",
              backgroundColor: "var(--kg-surface-2)",
            }}
          >
            <span className="text-sm" style={{ color: "var(--kg-text)" }}>
              合計
            </span>
            <span className="text-sm font-num text-right text-muted-foreground">
              {formatVND(totals.target)}
            </span>
            <span
              className="text-sm font-num text-right"
              style={{ color: "var(--kg-text)" }}
            >
              {formatVND(totals.projected)}
            </span>
            <span
              className="text-sm font-num text-right flex items-center justify-end gap-1"
              style={{
                color:
                  totals.balance >= 0
                    ? "var(--kg-success)"
                    : "var(--kg-danger)",
              }}
            >
              {totals.balance >= 0 ? (
                <TrendingDown size={11} />
              ) : (
                <TrendingUp size={11} />
              )}
              {totals.balance > 0 ? "+" : ""}
              {formatVND(totals.balance)}
            </span>
            <span
              className="text-sm font-num text-right"
              style={{
                color:
                  totalCumulative >= 0
                    ? "var(--kg-success)"
                    : "var(--kg-danger)",
              }}
            >
              {totalCumulative > 0 ? "+" : ""}
              {formatVND(totalCumulative)}
            </span>
          </div>

          {[...data.months].reverse().map((m) => {
            const isCurrent = currentMonth?.key === m.key;
            const monthSaved = m.balance >= 0;
            return (
              <div
                key={m.key}
                className="grid items-center px-7 py-4 border-b last:border-0"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                  borderColor: "var(--kg-border-subtle)",
                  backgroundColor: isCurrent
                    ? "var(--color-success-bg)"
                    : "transparent",
                  borderLeft: isCurrent
                    ? "3px solid var(--kg-accent)"
                    : "3px solid transparent",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isCurrent ? "var(--kg-accent)" : "var(--kg-text)",
                  }}
                >
                  {m.label}
                  {isCurrent && (
                    <span className="ml-1 text-xs opacity-60">（今月）</span>
                  )}
                </span>
                <span className="text-sm font-num text-right text-muted-foreground">
                  {formatVND(m.target)}
                </span>
                <span
                  className="text-sm font-num text-right"
                  style={{ color: "var(--kg-text)" }}
                >
                  {formatVND(m.projected)}
                </span>
                <span
                  className="text-sm font-num font-semibold text-right flex items-center justify-end gap-1"
                  style={{
                    color: monthSaved
                      ? "var(--kg-success)"
                      : "var(--kg-danger)",
                  }}
                >
                  {monthSaved ? (
                    <TrendingDown size={11} />
                  ) : (
                    <TrendingUp size={11} />
                  )}
                  {m.balance > 0 ? "+" : ""}
                  {formatVND(m.balance)}
                </span>
                <span
                  className="text-sm font-num font-semibold text-right"
                  style={{
                    color:
                      m.cumulative >= 0
                        ? "var(--kg-success)"
                        : "var(--kg-danger)",
                  }}
                >
                  {m.cumulative > 0 ? "+" : ""}
                  {formatVND(m.cumulative)}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
