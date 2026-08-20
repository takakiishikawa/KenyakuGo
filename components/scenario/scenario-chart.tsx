"use client";

import { useRef, useState } from "react";
import type { ChartBundle } from "@/lib/scenario/chart";
import { DC } from "@/lib/scenario/design-colors";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// デザイン(PiggyBank.dc.html renderChartSvg)を移植した、積み上げ/折れ線を
// 切り替えられるインラインSVGチャート。DSのChartAreaは複数系列の積み上げ・
// カスタム凡例に対応していないため、専用実装として持つ。
export function ScenarioChart({
  bundle,
  formatAmount,
}: {
  bundle: ChartBundle;
  formatAmount: (yen: number) => string;
}) {
  const W = 1080;
  const H = 340;
  const padL = 68;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const { years, series, stacked, total } = bundle;
  const n = years.length;
  const xStep = (W - padL - padR) / (n - 1 || 1);
  const xScale = (i: number) => padL + i * xStep;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  let maxV = 0;
  let minV = 0;
  if (stacked) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const s of series) sum += s.values[i] ?? 0;
      maxV = Math.max(maxV, sum);
    }
  } else {
    for (const s of series) {
      for (const v of s.values) {
        maxV = Math.max(maxV, v);
        minV = Math.min(minV, v);
      }
    }
  }
  if (maxV === minV) maxV = minV + 1;
  const yScale = (v: number) => H - padB - ((v - minV) / (maxV - minV)) * (H - padB - padT);

  const paths: { d?: string; line?: string; fill?: string; stroke: string }[] = [];
  // hover時に各系列の値を正しい高さ(積み上げなら積み上げ後の位置)にマーカー表示
  // するため、系列ごと・インデックスごとのY座標も一緒に持っておく。
  const seriesPointY: number[][] = [];
  if (stacked) {
    const cum = new Array(n).fill(0);
    for (const s of series) {
      const top = s.values.map((v, i) => {
        const y = yScale(cum[i] + v);
        cum[i] += v;
        return y;
      });
      seriesPointY.push(top);
      let d = `M${xScale(0)},${yScale(cum[0] - s.values[0])}`;
      for (let i = 0; i < n; i++) d += ` L${xScale(i)},${top[i]}`;
      for (let i = n - 1; i >= 0; i--) d += ` L${xScale(i)},${yScale(cum[i] - s.values[i])}`;
      d += " Z";
      paths.push({ d, fill: hexToRgba(s.color, 0.85), stroke: s.color });
    }
  } else {
    for (const s of series) {
      const d = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" L");
      paths.push({ line: `M${d}`, stroke: s.color });
      seriesPointY.push(s.values.map((v) => yScale(v)));
    }
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = minV + (maxV - minV) * f;
    return { y: yScale(v), label: formatAmount(v) };
  });
  const xTicks = years.map((y, i) => ({ label: y, x: xScale(i) }));
  const showEveryNthTick = Math.max(1, Math.ceil(n / 16));

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round((svgX - padL) / xStep);
    setHoverIdx(Math.min(n - 1, Math.max(0, idx)));
  };

  const tooltipOnRight = hoverIdx !== null && xScale(hoverIdx) < W * 0.6;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3.5">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: DC.textSecondary }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block"
          // ページ全体でスクロールが要らず、かつ下に余分な余白も残らないよう、
          // 「画面の高さ - 上に乗っているコントロール類のだいたいの高さ」を基準に
          // 動的に決める(固定のvh/px指定だと画面サイズによって短すぎたり
          // スクロールが必要になったりしていたため)。
          style={{ height: "clamp(320px, calc(100vh - 340px), 560px)", minHeight: 280 }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {gridLines.map((gl, i) => (
            <g key={i}>
              <line x1={padL} y1={gl.y} x2={W - padR} y2={gl.y} stroke={DC.cardBorder} strokeWidth={1} />
              <text x={padL - 10} y={gl.y} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={DC.textFaint}>
                {gl.label}
              </text>
            </g>
          ))}
          {paths.map((p, i) =>
            p.d ? (
              <path key={i} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={1} />
            ) : (
              <path key={i} d={p.line} fill="none" stroke={p.stroke} strokeWidth={2.5} />
            ),
          )}
          {xTicks
            .filter((_, i) => i % showEveryNthTick === 0)
            .map((xt) => (
              <text key={xt.x} x={xt.x} y={H - 6} textAnchor="middle" fontSize={10.5} fill={DC.textFaint}>
                {xt.label}
              </text>
            ))}
          {hoverIdx !== null && (
            <g>
              <line
                x1={xScale(hoverIdx)}
                y1={padT}
                x2={xScale(hoverIdx)}
                y2={H - padB}
                stroke={DC.textFaint}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {series.map((s, si) => (
                <circle
                  key={s.label}
                  cx={xScale(hoverIdx)}
                  cy={seriesPointY[si][hoverIdx]}
                  r={3.5}
                  fill={DC.cardBg}
                  stroke={s.color}
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
          {/* hover検出用の透明なオーバーレイ。プロット全域をカバーし、系列の
              線の上に乗らなくてもグラフのどこにマウスがあっても反応する。 */}
          <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="transparent" />
        </svg>
        {hoverIdx !== null && (
          <div
            className="absolute pointer-events-none flex flex-col gap-1 rounded-lg border px-2.5 py-2 text-[11.5px] shadow-sm"
            style={{
              left: `${(xScale(hoverIdx) / W) * 100}%`,
              top: 4,
              transform: tooltipOnRight ? "translateX(12px)" : "translateX(calc(-100% - 12px))",
              backgroundColor: DC.cardBg,
              borderColor: DC.cardBorder,
              color: DC.textPrimary,
              width: "max-content",
              minWidth: 140,
              maxWidth: 240,
            }}
          >
            <span className="font-semibold" style={{ color: DC.textSecondary }}>
              {years[hoverIdx]}
            </span>
            {total && (
              <div className="flex items-center justify-between gap-3 pb-1 mb-0.5 border-b" style={{ borderColor: DC.trackAlt }}>
                <span className="font-semibold whitespace-nowrap shrink-0">{total.label}</span>
                <span className="font-num font-semibold whitespace-nowrap">{formatAmount(total.values[hoverIdx] ?? 0)}</span>
              </div>
            )}
            {series
              // その月/年だけ¥0の系列は(他の月では値があっても)tooltipに出さない。
              .filter((s) => (s.values[hoverIdx] ?? 0) !== 0)
              .map((s) => {
                const v = s.values[hoverIdx] ?? 0;
                const positive = v >= 0;
                const items = s.breakdown?.[hoverIdx];
                return (
                  <div key={s.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </span>
                      <span
                        className="font-num font-semibold whitespace-nowrap"
                        style={s.signed ? { color: positive ? DC.success : DC.danger } : undefined}
                      >
                        {s.signed && positive ? "+" : ""}
                        {formatAmount(v)}
                      </span>
                    </div>
                    {items && items.length > 0 && (
                      <div className="flex flex-col gap-0.5 pl-3.5">
                        {items.map((it, ii) => (
                          <div key={ii} className="flex items-center justify-between gap-3" style={{ color: DC.textFaint }}>
                            <span className="truncate">{it.label}</span>
                            <span className="font-num shrink-0">{formatAmount(it.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
