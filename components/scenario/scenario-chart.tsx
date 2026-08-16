"use client";

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
  const { years, series, stacked } = bundle;
  const n = years.length;
  const xStep = (W - padL - padR) / (n - 1 || 1);
  const xScale = (i: number) => padL + i * xStep;

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
  if (stacked) {
    const cum = new Array(n).fill(0);
    for (const s of series) {
      const top = s.values.map((v, i) => {
        const y = yScale(cum[i] + v);
        cum[i] += v;
        return y;
      });
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
    }
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = minV + (maxV - minV) * f;
    return { y: yScale(v), label: formatAmount(v) };
  });
  const xTicks = years.map((y, i) => ({ label: y, x: xScale(i) }));
  const showEveryNthTick = Math.max(1, Math.ceil(n / 16));

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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: "min(60vh, 420px)", minHeight: 280 }}>
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
      </svg>
    </div>
  );
}
