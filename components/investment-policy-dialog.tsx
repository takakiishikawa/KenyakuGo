"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@takaki/go-design-system";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

// サイドバーからいつでも呼び出せる「投資方針メモ」。運用ルールは頻繁には変わらない
// ため、専用ページではなくポップアップ(Dialog)としてどの画面からも1クリックで
// 参照できるようにする。
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b last:border-b-0" style={{ borderColor: DC.trackAlt }}>
      <div className="text-[11px] font-semibold tracking-wide mb-1" style={{ color: DC.textFaint }}>
        {label}
      </div>
      <div className="text-[13px] leading-relaxed" style={{ color: DC.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

export function InvestmentPolicyDialog({
  open,
  onOpenChange,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>{t(lang, "investmentPolicy")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-1 max-h-[70vh] overflow-y-auto">
          <Field label={t(lang, "ipAccountLabel")} value={t(lang, "ipAccountValue")} />
          <Field label={t(lang, "ipStrategyLabel")} value={t(lang, "ipStrategyValue")} />
          <Field label={t(lang, "ipCashLabel")} value={t(lang, "ipCashValue")} />
          <Field label={t(lang, "ipUniverseLabel")} value={t(lang, "ipUniverseValue")} />

          {/* コア・サテライト配分(70/30)を一目でわかるようにバーで可視化 */}
          <div className="pt-3 pb-2">
            <div className="flex h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: DC.track }}>
              <div className="h-full" style={{ width: "70%", backgroundColor: DC.primary }} />
              <div className="h-full" style={{ width: "30%", backgroundColor: DC.primaryHover }} />
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2">
              <div className="rounded-lg p-3" style={{ backgroundColor: DC.trackAlt }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DC.primary }} />
                  <span className="text-[12px] font-semibold" style={{ color: DC.textPrimary }}>
                    {t(lang, "ipCoreTitle")}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: DC.textSecondary }}>
                  {t(lang, "ipCoreValue")}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: DC.trackAlt }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DC.primaryHover }} />
                  <span className="text-[12px] font-semibold" style={{ color: DC.textPrimary }}>
                    {t(lang, "ipSatelliteTitle")}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: DC.textSecondary }}>
                  {t(lang, "ipSatelliteValue")}
                </p>
              </div>
            </div>
          </div>

          <Field label={t(lang, "ipRemittanceLabel")} value={t(lang, "ipRemittanceValue")} />
          <div className="h-3" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
