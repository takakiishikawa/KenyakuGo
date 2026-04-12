"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatVND, formatDate } from "@/lib/format";

const COLORS = ["#1B4332", "#2D6A4F", "#52B788", "#74C69D", "#95D5B2", "#B7E4C7", "#D8F3DC"];

interface DashboardData {
  thisMonthTotal: number;
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDiff: number;
  damBalance: number;
  targetMonthly: number;
  categoryBreakdown: { name: string; value: number }[];
  recentTransactions: {
    id: string;
    store: string;
    amount: number;
    category: string;
    date: string;
  }[];
}

function CategoryBadge({ category }: { category: string }) {
  const isUncategorized = category === "その他";
  return (
    <Badge
      style={{
        backgroundColor: isUncategorized ? "#F59E0B" : "#52B788",
        color: "white",
      }}
    >
      {isUncategorized ? "未分類" : category}
    </Badge>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [comment, setComment] = useState<string>("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setData(json);

    if (json.categoryBreakdown?.length > 0) {
      setCommentLoading(true);
      const commentRes = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dashboard",
          data: Object.fromEntries(
            json.categoryBreakdown.map((c: { name: string; value: number }) => [c.name, c.value])
          ),
        }),
      });
      const { comment: c } = await commentRes.json();
      setComment(c);
      setCommentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync");
      const json = await res.json();
      if (!res.ok) {
        toast.error(`同期失敗: ${json.error ?? res.status}`);
        return;
      }
      toast.success(`${json.synced}件取得しました`);
      fetchDashboard();
    } catch (e) {
      toast.error(`同期失敗: ${e instanceof Error ? e.message : "network error"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>
          ダッシュボード
        </h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#1B4332" }}
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "同期中..." : "同期"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              今月の総支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>
              {data ? formatVND(data.thisMonthTotal) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              先週比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data && data.weekDiff < 0 ? (
                <TrendingDown size={24} style={{ color: "#10B981" }} />
              ) : (
                <TrendingUp size={24} style={{ color: "#EF4444" }} />
              )}
              <p
                className="text-3xl font-bold"
                style={{ color: data && data.weekDiff <= 0 ? "#10B981" : "#EF4444" }}
              >
                {data ? `${data.weekDiff > 0 ? "+" : ""}${data.weekDiff}%` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              ダム残高
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-3xl font-bold"
              style={{ color: data && data.damBalance >= 0 ? "#10B981" : "#EF4444" }}
            >
              {data ? formatVND(data.damBalance) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
              今週のカテゴリ別支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {data.categoryBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatVND(value as number)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12" style={{ color: "#6B7280" }}>
                今週の取引データがありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
              AIコメント
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commentLoading ? (
              <div className="space-y-2">
                <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
                <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: "#E5E7EB" }} />
              </div>
            ) : comment ? (
              <p className="text-sm leading-relaxed" style={{ color: "#1A1A2E" }}>
                {comment}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "#6B7280" }}>
                取引データを同期するとAIコメントが表示されます
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            直近の取引
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={tx.category} />
                    <span className="text-sm font-medium" style={{ color: "#1A1A2E" }}>
                      {tx.store}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "#1A1A2E" }}>
                      {formatVND(tx.amount)}
                    </p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: "#6B7280" }}>
              取引データがありません。同期ボタンを押してください。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
