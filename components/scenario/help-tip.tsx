"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@takaki/go-design-system";

// 要件6章の「?」ツールチップ。ホバー/タップで目安情報を表示する。
// カーソルは cursor-help (OSの?バッジ付きカーソル)ではなく、他のクリック可能な
// 要素と同じ cursor-pointer にする(不自然だと指摘されたため)。表示までの遅延も
// 既定の700msだと遅く感じるので150msに短縮する。
// 「。」区切り(日本語)・「. 」区切り(英語)ごとに改行して表示する。1文が長い
// 目安テキストを1行にまとめて出すと読みにくいという指摘への対応。
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=。)|(?<=\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function HelpTip({ text }: { text: string }) {
  const lines = splitSentences(text);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center align-middle cursor-pointer"
            style={{ color: "var(--color-text-subtle)" }}
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-xs leading-relaxed">
          {lines.length > 1 ? (
            <div className="flex flex-col gap-1">
              {lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ) : (
            text
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
