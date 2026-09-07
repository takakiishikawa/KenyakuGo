"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, InlineEdit, Spinner, toast } from "@takaki/go-design-system";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

// サイドバーからいつでも呼び出せる「投資方針メモ」。運用ルールは頻繁には
// 変わらないため、専用ページではなくポップアップ(Dialog)としてどの画面
// からも1クリックで参照でき、その場で編集もできるようにする。
// 「全体を編集モードにする」のではなく、go-design-systemのInlineEditで
// 項目をクリックしたその場で編集→フォーカスを外すかEnterで即保存、という
// 直感的な操作にする(項目ごとに独立して編集・保存できる)。
// 内容はDB(piggybank.investment_policy、1行のみのシングルトンテーブル)に
// 保存し、/api/investment-policy 経由で読み書きする。

interface PolicyData {
  account: string;
  strategy: string;
  cash: string;
  universe: string;
  core_note: string;
  satellite_note: string;
  remarks: string;
}

const EMPTY_POLICY: PolicyData = {
  account: "",
  strategy: "",
  cash: "",
  universe: "",
  core_note: "",
  satellite_note: "",
  remarks: "",
};

function toPayload(p: PolicyData) {
  return {
    account: p.account,
    strategy: p.strategy,
    cash: p.cash,
    universe: p.universe,
    coreNote: p.core_note,
    satelliteNote: p.satellite_note,
    remarks: p.remarks,
  };
}

function Field({
  label,
  value,
  hint,
  onSave,
}: {
  label: string;
  value: string;
  hint: string;
  onSave: (value: string) => void;
}) {
  return (
    <div className="py-2.5 border-b last:border-b-0" style={{ borderColor: DC.trackAlt }}>
      <div className="text-[11px] font-semibold tracking-wide mb-1" style={{ color: DC.textFaint }}>
        {label}
      </div>
      <InlineEdit
        value={value}
        onChange={onSave}
        multiline
        placeholder={hint}
        className="text-[13px] leading-relaxed -mx-1"
      />
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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PolicyData>(EMPTY_POLICY);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/investment-policy")
      .then((res) => res.json())
      .then((json: PolicyData) => setData(json))
      .finally(() => setLoading(false));
  }, [open]);

  async function saveField(key: keyof PolicyData, value: string) {
    const prev = data;
    const next = { ...data, [key]: value };
    setData(next); // クリックで即編集→即保存という体験に合わせ、まず楽観的に反映
    try {
      const res = await fetch("/api/investment-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(next)),
      });
      if (!res.ok) throw new Error("save failed");
      const json: PolicyData = await res.json();
      setData(json);
    } catch {
      setData(prev);
      toast.error(t(lang, "investmentPolicySaveFailed"));
    }
  }

  const hint = t(lang, "ipEditHint");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>{t(lang, "investmentPolicy")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-1 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <Field
                label={t(lang, "ipAccountLabel")}
                value={data.account}
                hint={hint}
                onSave={(v) => saveField("account", v)}
              />
              <Field
                label={t(lang, "ipStrategyLabel")}
                value={data.strategy}
                hint={hint}
                onSave={(v) => saveField("strategy", v)}
              />
              <Field
                label={t(lang, "ipCashLabel")}
                value={data.cash}
                hint={hint}
                onSave={(v) => saveField("cash", v)}
              />
              <Field
                label={t(lang, "ipUniverseLabel")}
                value={data.universe}
                hint={hint}
                onSave={(v) => saveField("universe", v)}
              />

              {/* コア・サテライト配分(70/30)を一目でわかるようにバーで可視化。
                  各配分の説明文はカード内でそのままクリック編集できる。 */}
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
                    <InlineEdit
                      value={data.core_note}
                      onChange={(v) => saveField("core_note", v)}
                      multiline
                      placeholder={hint}
                      className="text-[12.5px] leading-relaxed -mx-1"
                    />
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: DC.trackAlt }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DC.primaryHover }} />
                      <span className="text-[12px] font-semibold" style={{ color: DC.textPrimary }}>
                        {t(lang, "ipSatelliteTitle")}
                      </span>
                    </div>
                    <InlineEdit
                      value={data.satellite_note}
                      onChange={(v) => saveField("satellite_note", v)}
                      multiline
                      placeholder={hint}
                      className="text-[12.5px] leading-relaxed -mx-1"
                    />
                  </div>
                </div>
              </div>

              <Field
                label={t(lang, "ipRemarksLabel")}
                value={data.remarks}
                hint={hint}
                onSave={(v) => saveField("remarks", v)}
              />
              <div className="h-3" />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
