"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@takaki/go-design-system";

// 要件6章の「?」ツールチップ。ホバー/タップで目安情報を表示する。
export function HelpTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center align-middle cursor-help"
            style={{ color: "var(--color-text-subtle)" }}
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 text-xs leading-snug">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
