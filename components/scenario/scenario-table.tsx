"use client";

import { useRef } from "react";
import { ChevronRight, UnfoldVertical, FoldVertical } from "lucide-react";
import type { TableRow as ScenarioTableRow } from "@/lib/scenario/table-rows";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

// 1列目だけ固定幅、年月列は幅を指定しない(table-layout:fixedでは、幅未指定の
// 列は残りの横幅を均等に分け合う)。テーブル自体をwidth:100%にすることで、
// 画面が広いときは余白を作らず目一杯使い、YEAR_COL_MIN_WIDTHを下回りそうな
// 狭い画面でだけ横スクロールに切り替わる(以前は列幅を固定pxで決め打ちして
// いたため、広い画面では右側に無駄な余白ができていた)。
const FIRST_COL_WIDTH = 140;
const YEAR_COL_MIN_WIDTH = 92;

// position:sticky(top)を横スクロールする要素の中で使うと、CSSの仕様上
// overflow-x:auto指定が同じ要素のoverflow-yも(見た目上は何も起きなくても)
// 非visible化してしまい、sticky の基準がその要素自身になって「ページを
// 縦スクロールしても付いてこない」バグになる(実機検証済み)。
// そのため、ヘッダー行だけを別テーブルとして画面の縦スクロールに乗せ
// (position:sticky top:0はページのスクロールコンテナ基準で正しく効く)、
// 本体テーブルの横スクロールに合わせてJSでヘッダー側のscrollLeftを同期する。
export function ScenarioTable({
  rows,
  columnLabels,
  firstColumnLabel,
  expandAll,
  onToggleExpandAll,
  onToggleRow,
  lang,
  currentColumnLabel = null,
}: {
  rows: ScenarioTableRow[];
  columnLabels: string[];
  firstColumnLabel: string;
  expandAll: boolean;
  onToggleExpandAll: () => void;
  onToggleRow: (key: string) => void;
  lang: Lang;
  // 一致する列(月次表示の当月など)をハイライトする。無ければハイライトしない。
  currentColumnLabel?: string | null;
}) {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const syncHeaderScroll = () => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

  const minTableWidth = FIRST_COL_WIDTH + columnLabels.length * YEAR_COL_MIN_WIDTH;

  // 年月列にはwidthを指定しない(table-layout:fixedが残り幅を均等割りしてくれる)。
  const colgroup = (
    <colgroup>
      <col style={{ width: FIRST_COL_WIDTH }} />
      {columnLabels.map((_, i) => (
        <col key={i} />
      ))}
    </colgroup>
  );

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

      {/* 注意: このラッパーに overflow-hidden を付けると、それが sticky ヘッダーの
          最も近い「overflowが非visibleな祖先」になってしまい、ページの縦スクロールに
          追従しなくなる(実機で確認済みのバグ)。角丸クリップは代わりにヘッダー/本体
          それぞれの要素に個別のborder-radiusで再現する。 */}
      <div className="rounded-2xl border" style={{ borderColor: DC.cardBorder, backgroundColor: DC.cardBg }}>
        {/* ヘッダー: ページの縦スクロールに乗って上端に固定される。横方向は
            overflow-x:hidden でクリップし、本体側のスクロールに追従させる。 */}
        <div
          ref={headerScrollRef}
          className="sticky top-0 z-20 overflow-x-hidden"
          style={{ backgroundColor: DC.headerBg, borderTopLeftRadius: 15, borderTopRightRadius: 15 }}
        >
          <table style={{ width: "100%", minWidth: minTableWidth, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
            {colgroup}
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 text-left whitespace-nowrap font-semibold"
                  style={{
                    backgroundColor: DC.headerBg,
                    color: DC.textFaint,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "11px 16px",
                    borderBottom: `1px solid ${DC.cardBorder}`,
                    borderRight: `1px solid ${DC.cardBorder}`,
                  }}
                >
                  {firstColumnLabel}
                </th>
                {columnLabels.map((label, i) => {
                  const isCurrent = label === currentColumnLabel;
                  return (
                    <th
                      key={i}
                      className="text-right whitespace-nowrap"
                      style={{
                        backgroundColor: DC.headerBg,
                        color: isCurrent ? DC.primaryHover : DC.textPrimary,
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "11px 10px",
                        borderTop: isCurrent ? `1px solid ${DC.primary}` : undefined,
                        borderLeft: isCurrent ? `1px solid ${DC.primary}` : undefined,
                        borderRight: isCurrent ? `1px solid ${DC.primary}` : undefined,
                        borderBottom: `1px solid ${DC.cardBorder}`,
                      }}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>

        {/* 本体: 横スクロールはここだけに閉じ込める(縦はページ全体に任せる)。 */}
        <div
          ref={bodyScrollRef}
          onScroll={syncHeaderScroll}
          className="overflow-x-auto"
          style={{ borderBottomLeftRadius: 15, borderBottomRightRadius: 15, overflowY: "hidden" }}
        >
          <table style={{ width: "100%", minWidth: minTableWidth, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
            {colgroup}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.key}>
                  <td
                    onClick={row.expandable ? () => onToggleRow(row.key) : undefined}
                    className="sticky left-0 z-10 whitespace-nowrap overflow-hidden text-ellipsis"
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
                  {row.cells.map((cell, i) => {
                    const isCurrent = columnLabels[i] === currentColumnLabel;
                    const isLastRow = rowIndex === rows.length - 1;
                    return (
                      <td
                        key={i}
                        title={cell.delta ? `${cell.fmt} (${cell.delta.fmt})` : cell.fmt}
                        className="text-right whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{
                          padding: "9px 10px",
                          fontSize: 12.5,
                          fontWeight: row.bold ? 700 : row.depth === 0 ? 600 : 400,
                          color: cell.negative ? DC.danger : DC.textPrimary,
                          backgroundColor: isCurrent ? "rgba(190,91,133,0.05)" : undefined,
                          borderLeft: isCurrent ? `1px solid ${DC.primary}` : undefined,
                          borderRight: isCurrent ? `1px solid ${DC.primary}` : undefined,
                          borderBottom: isCurrent && isLastRow ? `1px solid ${DC.primary}` : `1px solid ${DC.trackAlt}`,
                        }}
                      >
                        {cell.fmt}
                        {cell.delta && (
                          <div
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: cell.delta.positive ? DC.success : DC.danger,
                              marginTop: 1,
                            }}
                          >
                            {cell.delta.fmt}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
