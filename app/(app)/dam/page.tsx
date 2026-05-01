"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { MonthRecord } from "@/app/api/dam/route";
import {
  Card,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@takaki/go-design-system";

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
      <PageHeader title="ダム" />

      {data && data.months.length > 0 && totals && (
        <Card className="mt-8 animate-fade-up overflow-hidden">
          <div className="px-7 py-5 border-b">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              月別倹約履歴
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-7 text-xs uppercase tracking-wider">
                  月
                </TableHead>
                <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
                  予算
                </TableHead>
                <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
                  支出
                </TableHead>
                <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
                  倹約額
                </TableHead>
                <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
                  累計
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* 合計行 */}
              <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40 border-b-2 border-border">
                <TableCell className="px-7 py-4 text-sm text-foreground">
                  合計
                </TableCell>
                <TableCell className="px-7 py-4 text-sm font-num text-right text-muted-foreground">
                  {formatVND(totals.target)}
                </TableCell>
                <TableCell className="px-7 py-4 text-sm font-num text-right text-foreground">
                  {formatVND(totals.projected)}
                </TableCell>
                <TableCell
                  className="px-7 py-4 text-sm font-num text-right"
                  style={{
                    color:
                      totals.balance >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {totals.balance >= 0 ? (
                      <TrendingDown size={11} />
                    ) : (
                      <TrendingUp size={11} />
                    )}
                    {totals.balance > 0 ? "+" : ""}
                    {formatVND(totals.balance)}
                  </span>
                </TableCell>
                <TableCell
                  className="px-7 py-4 text-sm font-num text-right"
                  style={{
                    color:
                      totalCumulative >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
                  {totalCumulative > 0 ? "+" : ""}
                  {formatVND(totalCumulative)}
                </TableCell>
              </TableRow>

              {[...data.months].reverse().map((m) => {
                const isCurrent = currentMonth?.key === m.key;
                const monthSaved = m.balance >= 0;
                return (
                  <TableRow
                    key={m.key}
                    className={
                      isCurrent
                        ? "bg-primary/[0.04] hover:bg-primary/[0.08]"
                        : ""
                    }
                  >
                    <TableCell className="px-7 py-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isCurrent ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {m.label}
                        </span>
                        {isCurrent && (
                          <Tag color="info" className="text-[10px] px-1.5 py-0">
                            予測
                          </Tag>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="px-7 py-4 text-sm font-num text-right text-muted-foreground">
                      {formatVND(m.target)}
                    </TableCell>
                    <TableCell className="px-7 py-4 text-sm font-num text-right text-foreground">
                      {formatVND(m.projected)}
                    </TableCell>
                    <TableCell
                      className="px-7 py-4 text-sm font-num font-semibold text-right"
                      style={{
                        color: monthSaved
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                      }}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        {monthSaved ? (
                          <TrendingDown size={11} />
                        ) : (
                          <TrendingUp size={11} />
                        )}
                        {m.balance > 0 ? "+" : ""}
                        {formatVND(m.balance)}
                      </span>
                    </TableCell>
                    <TableCell
                      className="px-7 py-4 text-sm font-num font-semibold text-right"
                      style={{
                        color:
                          m.cumulative >= 0
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                      }}
                    >
                      {m.cumulative > 0 ? "+" : ""}
                      {formatVND(m.cumulative)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
