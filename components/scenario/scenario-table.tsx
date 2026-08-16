"use client";

import { ChevronRight, UnfoldVertical, FoldVertical } from "lucide-react";
import type { TableRow as ScenarioTableRow } from "@/lib/scenario/table-rows";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

// go-design-systemの<Table>は内部で "relative w-full overflow-auto" のdivを
// もう1枚被せてくる(縦横どちらもスクロール可能)。それをそのまま使うと、この
// コンポーネント側で用意する横スクロール専用のラッパーと二重になり、
// sticky指定(1列目・ヘッダー行)の基準がどちらのスクロールコンテナか曖昧になって
// 「横スクロールすると1列目と他の列が重なる」バグが起きる。
// そのため<Table>本体は使わず、素の<table>要素を自前でスクロールラッパーに
// 入れる(横スクロールのみ・縦は画面全体のスクロールに任せる)。
export function ScenarioTable({
  rows,
  columnLabels,
  firstColumnLabel,
  expandAll,
  onToggleExpandAll,
  onToggleRow,
  lang,
}: {
  rows: ScenarioTableRow[];
  columnLabels: string[];
  firstColumnLabel: string;
  expandAll: boolean;
  onToggleExpandAll: () => void;
  onToggleRow: (key: string) => void;
  lang: Lang;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleExpandAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:brightness-95 active:scale-95"
          style={{ backgroundColor: DC.track, color: DC.textSecondary }}
        >
          {expandAll ? <FoldVertical size={12} /> : <UnfoldVertical size={12} />}
          {expandAll ? t(lang, "collapseAll") : t(lang, "expandAll")}
        </button>
      </div>

      <div
        className="rounded-2xl border overflow-x-auto"
        style={{ borderColor: DC.cardBorder, backgroundColor: DC.cardBg }}
      >
        <table className="border-collapse w-full" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-20 text-left whitespace-nowrap font-semibold"
                style={{
                  backgroundColor: DC.headerBg,
                  color: DC.textFaint,
                  fontSize: 11,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "11px 16px",
                  borderBottom: `1px solid ${DC.cardBorder}`,
                  borderRight: `1px solid ${DC.cardBorder}`,
                  minWidth: 200,
                }}
              >
                {firstColumnLabel}
              </th>
              {columnLabels.map((label, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 text-right whitespace-nowrap"
                  style={{
                    backgroundColor: DC.headerBg,
                    color: DC.textPrimary,
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "11px 14px",
                    borderBottom: `1px solid ${DC.cardBorder}`,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td
                  onClick={row.expandable ? () => onToggleRow(row.key) : undefined}
                  className="sticky left-0 z-10 whitespace-nowrap"
                  style={{
                    backgroundColor: DC.cardBg,
                    color: DC.textPrimary,
                    paddingTop: 9,
                    paddingBottom: 9,
                    paddingRight: 16,
                    paddingLeft: 16 + row.depth * 18,
                    fontSize: 12.5,
                    fontWeight: row.bold ? 700 : row.depth === 0 ? 600 : 400,
                    borderBottom: `1px solid ${DC.trackAlt}`,
                    borderRight: `1px solid ${DC.cardBorder}`,
                    cursor: row.expandable ? "pointer" : "default",
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {row.expandable && (
                      <ChevronRight
                        size={12}
                        style={{
                          color: DC.textFaint,
                          transform: row.expanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 120ms",
                        }}
                      />
                    )}
                    {row.label}
                  </span>
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className="text-right whitespace-nowrap"
                    style={{
                      padding: "9px 14px",
                      fontSize: 12.5,
                      fontWeight: row.bold ? 700 : row.depth === 0 ? 600 : 400,
                      color: cell.negative ? DC.danger : DC.textPrimary,
                      borderBottom: `1px solid ${DC.trackAlt}`,
                    }}
                  >
                    {cell.fmt}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
