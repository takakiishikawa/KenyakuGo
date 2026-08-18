"use client";

import { Sparkles } from "lucide-react";
import { t, type Lang } from "@/lib/scenario/dictionary";

// One-click toggle for flagging a one-off/exceptional transaction (e.g. a
// security deposit) as a special expense. This excludes it from the
// dashboard's budget math and mirrors it into the Simulation page's special
// expense list — Report/trend views are unaffected either way.
export function SpecialExpenseToggle({
  active,
  onToggle,
  lang = "en",
}: {
  active: boolean;
  onToggle: (next: boolean) => void;
  lang?: Lang;
}) {
  if (active) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(false);
        }}
        title={t(lang, "specialExpenseActiveTitle")}
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-all hover:opacity-80 active:scale-95 active:opacity-70 cursor-pointer"
        style={{ backgroundColor: "var(--color-primary-subtle)", color: "var(--color-primary-hover)" }}
      >
        <Sparkles size={11} />
        {t(lang, "specialExpenseLabel")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(true);
      }}
      title={t(lang, "specialExpenseInactiveTitle")}
      className="text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted active:scale-95 cursor-pointer"
      style={{ color: "var(--color-text-subtle)" }}
    >
      {t(lang, "specialExpenseLabel")}
    </button>
  );
}
