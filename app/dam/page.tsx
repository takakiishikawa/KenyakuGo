"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { formatVND } from "@/lib/format";

interface DamData {
  targetMonthly: number;
  thisMonthTotal: number;
  currentBalance: number;
  achievementRate: number;
  cumulativeBalance: number;
}

function DamVisual({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(level, 100));
  const waterTop = 220 - (pct / 100) * 200;

  return (
    <div className="flex flex-col items-center py-6">
      <svg width="260" height="260" viewBox="0 0 260 260">
        <defs>
          <clipPath id="damClip">
            <rect x="14" y="14" width="232" height="232" rx="12" />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52B788" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1B4332" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Outer border */}
        <rect
          x="14" y="14" width="232" height="232" rx="12"
          fill="#0D1F12"
          stroke="rgba(82,183,136,0.25)"
          strokeWidth="2"
        />

        {/* Water fill */}
        <g clipPath="url(#damClip)">
          <rect
            x="14"
            y={14 + waterTop}
            width="232"
            height={232 - waterTop}
            fill="url(#waterGrad)"
          />
          {/* Wave */}
          <path
            style={{ animation: "wave 3.5s ease-in-out infinite" }}
            d={`M -10 ${14 + waterTop + 6} Q 75 ${14 + waterTop - 8} 140 ${14 + waterTop + 6} Q 210 ${14 + waterTop + 20} 280 ${14 + waterTop + 6} L 280 260 L -10 260 Z`}
            fill="rgba(82,183,136,0.35)"
          />
        </g>

        {/* Percentage text */}
        <text
          x="130"
          y="122"
          textAnchor="middle"
          fontSize="52"
          fontWeight="600"
          fontFamily="var(--font-mono-display, monospace)"
          fill={pct > 45 ? "#E8F5E9" : "#52B788"}
        >
          {pct}%
        </text>
        <text
          x="130"
          y="148"
          textAnchor="middle"
          fontSize="12"
          fontFamily="var(--font-body, sans-serif)"
          fill={pct > 45 ? "rgba(232,245,233,0.6)" : "#6B8F71"}
          letterSpacing="3"
        >
          WATER LEVEL
        </text>
      </svg>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-24px); }
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
      <h1 className="font-display text-4xl mb-10" style={{ color: "#E8F5E9" }}>
        貯蓄ダム
      </h1>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Dam Visual */}
        <div className="kg-card-static p-6 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "#6B8F71" }}>
            今月の貯水状況
          </p>
          <DamVisual level={data?.achievementRate ?? 0} />
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-5">
          {[
            {
              label: "今月の貯水量",
              value: data ? formatVND(data.currentBalance) : "—",
              color: data && data.currentBalance >= 0 ? "#4CAF50" : "#EF5350",
              delay: 80,
            },
            {
              label: "達成率",
              value: data ? `${data.achievementRate}%` : "—",
              color: "#52B788",
              delay: 160,
            },
            {
              label: "累計ダム残高",
              value: data ? formatVND(data.cumulativeBalance) : "—",
              color: "#E8F5E9",
              delay: 240,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="kg-card p-7 animate-fade-up flex-1"
              style={{ animationDelay: `${card.delay}ms`, animationFillMode: "both" }}
            >
              <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "#6B8F71" }}>
                {card.label}
              </p>
              <p className="font-num text-3xl font-semibold" style={{ color: card.color }}>
                {card.value}
              </p>
              <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #52B788, transparent)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggest */}
      <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "280ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B8F71" }}>
            このお金で何ができる？
          </p>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "#52B788" }}
          >
            <Sparkles size={10} />
            AI
          </span>
        </div>
        <div className="border-l-2 pl-4" style={{ borderColor: "#52B788" }}>
          {commentLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ) : comment ? (
            <p className="text-sm leading-7 italic" style={{ color: "#B2CABA" }}>{comment}</p>
          ) : (
            <p className="text-sm" style={{ color: "#6B8F71" }}>
              設定画面で想定月支出を設定すると提案が表示されます
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
