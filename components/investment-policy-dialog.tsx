"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Spinner, Textarea } from "@takaki/go-design-system";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

// サイドバーからいつでも呼び出せる「投資方針メモ」。運用ルールは頻繁には
// 変わらないため、専用ページではなくポップアップ(Dialog)としてどの画面
// からも1クリックで参照でき、その場で編集もできるようにする。
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

function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b last:border-b-0" style={{ borderColor: DC.trackAlt }}>
      <div className="text-[11px] font-semibold tracking-wide mb-1" style={{ color: DC.textFaint }}>
        {label}
      </div>
      <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: DC.textPrimary }}>
        {value || "—"}
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="py-2">
      <label className="text-[11px] font-semibold tracking-wide mb-1 block" style={{ color: DC.textFaint }}>
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-[13px] resize-none"
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
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<PolicyData>(EMPTY_POLICY);
  const [draft, setDraft] = useState<PolicyData>(EMPTY_POLICY);

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setLoading(true);
    fetch("/api/investment-policy")
      .then((res) => res.json())
      .then((json: PolicyData) => {
        setData(json);
        setDraft(json);
      })
      .finally(() => setLoading(false));
  }, [open]);

  function startEdit() {
    setDraft(data);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(data);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/investment-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: draft.account,
          strategy: draft.strategy,
          cash: draft.cash,
          universe: draft.universe,
          coreNote: draft.core_note,
          satelliteNote: draft.satellite_note,
          remarks: draft.remarks,
        }),
      });
      if (res.ok) {
        const json: PolicyData = await res.json();
        setData(json);
        setDraft(json);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader
          className="px-5 py-4 border-b flex-row items-center justify-between space-y-0"
          style={{ borderColor: DC.cardBorder }}
        >
          <DialogTitle>{t(lang, "investmentPolicy")}</DialogTitle>
          {!loading && !editing && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={startEdit}>
              <Pencil size={13} />
              {t(lang, "editAction")}
            </Button>
          )}
        </DialogHeader>

        <div className="px-5 py-1 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Spinner />
            </div>
          ) : editing ? (
            <>
              <EditField
                label={t(lang, "ipAccountLabel")}
                value={draft.account}
                onChange={(v) => setDraft((d) => ({ ...d, account: v }))}
              />
              <EditField
                label={t(lang, "ipStrategyLabel")}
                value={draft.strategy}
                onChange={(v) => setDraft((d) => ({ ...d, strategy: v }))}
              />
              <EditField
                label={t(lang, "ipCashLabel")}
                value={draft.cash}
                onChange={(v) => setDraft((d) => ({ ...d, cash: v }))}
              />
              <EditField
                label={t(lang, "ipUniverseLabel")}
                value={draft.universe}
                onChange={(v) => setDraft((d) => ({ ...d, universe: v }))}
              />
              <EditField
                label={t(lang, "ipCoreTitle")}
                value={draft.core_note}
                onChange={(v) => setDraft((d) => ({ ...d, core_note: v }))}
              />
              <EditField
                label={t(lang, "ipSatelliteTitle")}
                value={draft.satellite_note}
                onChange={(v) => setDraft((d) => ({ ...d, satellite_note: v }))}
              />
              <EditField
                label={t(lang, "ipRemarksLabel")}
                value={draft.remarks}
                onChange={(v) => setDraft((d) => ({ ...d, remarks: v }))}
              />

              <div className="flex justify-end gap-2 py-3">
                <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  {t(lang, "cancel")}
                </Button>
                <Button type="button" size="sm" onClick={save} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : t(lang, "save")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <ViewField label={t(lang, "ipAccountLabel")} value={data.account} />
              <ViewField label={t(lang, "ipStrategyLabel")} value={data.strategy} />
              <ViewField label={t(lang, "ipCashLabel")} value={data.cash} />
              <ViewField label={t(lang, "ipUniverseLabel")} value={data.universe} />

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
                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: DC.textSecondary }}>
                      {data.core_note || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: DC.trackAlt }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DC.primaryHover }} />
                      <span className="text-[12px] font-semibold" style={{ color: DC.textPrimary }}>
                        {t(lang, "ipSatelliteTitle")}
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: DC.textSecondary }}>
                      {data.satellite_note || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <ViewField label={t(lang, "ipRemarksLabel")} value={data.remarks} />
              <div className="h-3" />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
