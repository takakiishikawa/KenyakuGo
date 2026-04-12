"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatVND } from "@/lib/format";

interface WeeklyData {
  chartData: { category: string; 今週: number; 先週: number }[];
  thisWeekTotal: number;
  lastWeekTotal: number;
  diff: number;
  topCategory: string;
  thisWeekMap: Record<string, number>;
  lastWeekMap: Record<string, number>;
}

export default function WeeklyPage() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/weekly")
      .then(async (r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then(async (json: WeeklyData | undefined) => {
        if (!json) return;
        setData(json);
        if (json.chartData.length > 0) {
          setCommentLoading(true);
          const res = await fetch("/api/ai/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "weekly",
              data: { thisWeek: json.thisWeekMap, lastWeek: json.lastWeekMap },
            }),
          });
          const { comment: c } = await res.json();
          setComment(c);
          setCommentLoading(false);
        }
      });
  }, []);

  const diffColor = data && data.diff <= 0 ? "#10B981" : "#EF4444";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: "#1A1A2E" }}>
        週次レポート
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              今週の総支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>
              {data ? formatVND(data.thisWeekTotal) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              先週との差額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: diffColor }}>
              {data ? `${data.diff > 0 ? "+" : ""}${formatVND(data.diff)}` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              最多支出カテゴリ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>
              {data?.topCategory ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            今週 vs 先週 カテゴリ別比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.chartData}>
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatVND(value as number)} />
                <Legend />
                <Bar dataKey="今週" fill="#1B4332" />
                <Bar dataKey="先週" fill="#95D5B2" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: "#6B7280" }}>
              データがありません
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
  );
}
