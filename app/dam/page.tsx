"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVND } from "@/lib/format";

interface DamData {
  targetMonthly: number;
  thisMonthTotal: number;
  currentBalance: number;
  achievementRate: number;
  cumulativeBalance: number;
}

function DamVisual({ level }: { level: number }) {
  // level: 0-100 (percentage)
  const waterHeight = Math.max(0, Math.min(level, 100));
  const yOffset = 200 - (waterHeight / 100) * 200;

  return (
    <div className="flex justify-center py-8">
      <svg width="280" height="240" viewBox="0 0 280 240">
        {/* Dam body */}
        <rect x="10" y="10" width="260" height="220" rx="4" fill="none" stroke="#9CA3AF" strokeWidth="3" />

        {/* Water fill */}
        <clipPath id="damClip">
          <rect x="10" y="10" width="260" height="220" rx="4" />
        </clipPath>
        <g clipPath="url(#damClip)">
          <rect x="10" y={10 + (220 - (waterHeight / 100) * 220)} width="260" height={(waterHeight / 100) * 220} fill="#52B788" opacity="0.7" />
          {/* Wave animation */}
          <path
            style={{
              animation: "wave 3s ease-in-out infinite",
            }}
            d={`M 0 ${yOffset + 10} Q 70 ${yOffset} 140 ${yOffset + 10} Q 210 ${yOffset + 20} 280 ${yOffset + 10} L 280 230 L 0 230 Z`}
            fill="#52B788"
            opacity="0.5"
          />
        </g>

        {/* Percentage text */}
        <text
          x="140"
          y="130"
          textAnchor="middle"
          fontSize="36"
          fontWeight="bold"
          fill={waterHeight > 50 ? "white" : "#1B4332"}
        >
          {waterHeight}%
        </text>
        <text
          x="140"
          y="158"
          textAnchor="middle"
          fontSize="13"
          fill={waterHeight > 50 ? "white" : "#4B5563"}
        >
          貯水率
        </text>
      </svg>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
        }
      `}</style>
    </div>
  );
}

export default function DamPage() {
  const [data, setData] = useState<DamData | null>(null);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dam")
      .then(async (r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then(async (json: DamData | undefined) => {
        if (!json) return;
        setData(json);
        if (json.cumulativeBalance > 0) {
          setCommentLoading(true);
          const res = await fetch("/api/ai/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "dam",
              data: { cumulativeBalance: json.cumulativeBalance },
            }),
          });
          const { comment: c } = await res.json();
          setComment(c);
          setCommentLoading(false);
        }
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: "#1A1A2E" }}>
        ダム
      </h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Dam Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
              今月の貯水状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DamVisual level={data?.achievementRate ?? 0} />
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
                今月の貯水量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl font-bold"
                style={{ color: data && data.currentBalance >= 0 ? "#10B981" : "#EF4444" }}
              >
                {data ? formatVND(data.currentBalance) : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
                達成率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: "#52B788" }}>
                {data ? `${data.achievementRate}%` : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
                累計ダム残高
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: "#1B4332" }}>
                {data ? formatVND(data.cumulativeBalance) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Suggest Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            このお金で何ができる？
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commentLoading ? (
            <div className="space-y-2">
              <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="h-4 rounded animate-pulse w-4/5" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="h-4 rounded animate-pulse w-2/3" style={{ backgroundColor: "#E5E7EB" }} />
            </div>
          ) : comment ? (
            <p className="text-sm leading-relaxed" style={{ color: "#1A1A2E" }}>
              {comment}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              設定画面で想定月支出を設定すると提案が表示されます
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
