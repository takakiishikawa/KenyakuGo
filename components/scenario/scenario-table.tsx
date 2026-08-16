"use client";

import { ChevronRight, UnfoldVertical, FoldVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@takaki/go-design-system";
import type { TableRow as ScenarioTableRow } from "@/lib/scenario/table-rows";
import { t, type Lang } from "@/lib/scenario/dictionary";

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
          style={{ backgroundColor: "var(--kg-track)", color: "var(--color-text-secondary)" }}
        >
          {expandAll ? <FoldVertical size={12} /> : <UnfoldVertical size={12} />}
          {expandAll ? t(lang, "collapseAll") : t(lang, "expandAll")}
        </button>
      </div>

      <div
        className="rounded-2xl border overflow-auto"
        style={{ borderColor: "var(--color-border-default)", maxHeight: "calc(100vh - 320px)" }}
      >
        <Table style={{ minWidth: 900 }}>
          <TableHeader>
            <TableRow>
              <TableHead
                className="sticky left-0 top-0 z-20 whitespace-nowrap"
                style={{ backgroundColor: "var(--color-surface-subtle)", minWidth: 200 }}
              >
                {firstColumnLabel}
              </TableHead>
              {columnLabels.map((label) => (
                <TableHead
                  key={label}
                  className="text-right whitespace-nowrap sticky top-0 z-10"
                  style={{ backgroundColor: "var(--color-surface-subtle)" }}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell
                  onClick={row.expandable ? () => onToggleRow(row.key) : undefined}
                  className="sticky left-0 z-10 whitespace-nowrap"
                  style={{
                    backgroundColor: "var(--color-surface-default)",
                    paddingLeft: 16 + row.depth * 18,
                    fontWeight: row.bold ? 700 : row.depth === 0 ? 600 : 400,
                    cursor: row.expandable ? "pointer" : "default",
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {row.expandable && (
                      <ChevronRight
                        size={12}
                        style={{
                          color: "var(--color-text-subtle)",
                          transform: row.expanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 120ms",
                        }}
                      />
                    )}
                    {row.label}
                  </span>
                </TableCell>
                {row.cells.map((cell, i) => (
                  <TableCell
                    key={i}
                    className="text-right"
                    style={{
                      fontWeight: row.bold ? 700 : row.depth === 0 ? 600 : 400,
                      color: cell.negative ? "#C0392B" : undefined,
                    }}
                  >
                    {cell.fmt}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
