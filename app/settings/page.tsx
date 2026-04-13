"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [targetMonthly, setTargetMonthly] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      setTargetMonthly(String(data.targetMonthly));
      setFixedCosts(String(data.fixedCosts));
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ targetMonthly: parseInt(targetMonthly)||0, fixedCosts: parseInt(fixedCosts)||0 }),
    });
    toast.success("設定を保存しました");
    setSaving(false);
  };

  const handleDeleteAll = async () => {
    await fetch("/api/transactions/all", { method: "DELETE" });
    toast.success("全取引データを削除しました");
  };

  const inputStyle = {
    backgroundColor: "var(--kg-surface-2)",
    border: "1px solid var(--kg-border)",
    borderRadius: "8px",
    color: "var(--kg-text)",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s ease",
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-10" style={{ color: "var(--kg-text)" }}>設定</h1>

      <div className="space-y-5 max-w-xl">
        {/* Budget */}
        <div className="kg-card-static p-7 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "var(--kg-text-muted)" }}>予算設定</p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--kg-text-secondary)" }}>想定月支出（VND）</label>
              <input type="number" value={targetMonthly} onChange={(e) => setTargetMonthly(e.target.value)} placeholder="例: 10000000" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--kg-text-secondary)" }}>固定費合計（VND）</label>
              <input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(e.target.value)} placeholder="例: 3000000" style={inputStyle} />
              <p className="text-xs mt-2" style={{ color: "var(--kg-text-muted)" }}>家賃・借金返済などの合計</p>
            </div>
            <button
              onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: "var(--kg-accent)", color: "var(--kg-bg)" }}
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>

        {/* Google Account */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "var(--kg-text-muted)" }}>Googleアカウント</p>
          {user ? (
            <div className="flex items-center gap-4">
              {user.user_metadata?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url as string} alt="avatar" className="w-12 h-12 rounded-full"
                  style={{ outline: "2px solid var(--kg-accent)", outlineOffset: "2px" }} />
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--kg-text)" }}>{user.user_metadata?.full_name as string}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kg-text-muted)" }}>{user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>ログインしていません</p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "160ms", border: "1px solid rgba(239,83,80,0.2)", background: "rgba(239,83,80,0.04)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} style={{ color: "var(--kg-danger)" }} />
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-danger)" }}>危険ゾーン</p>
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--kg-text-muted)" }}>全ての取引データを削除します。この操作は取り消せません。</p>
          <AlertDialog>
            <AlertDialogTrigger className="px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
              style={{ backgroundColor: "rgba(239,83,80,0.12)", color: "var(--kg-danger)", border: "1px solid rgba(239,83,80,0.25)" }}>
              全取引データを削除
            </AlertDialogTrigger>
            <AlertDialogContent style={{ backgroundColor: "var(--kg-surface)", border: "1px solid var(--kg-border)", color: "var(--kg-text)" }}>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ color: "var(--kg-text)" }}>本当に削除しますか？</AlertDialogTitle>
                <AlertDialogDescription style={{ color: "var(--kg-text-muted)" }}>
                  全ての取引データが削除されます。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ backgroundColor: "var(--kg-surface-2)", borderColor: "var(--kg-border)", color: "var(--kg-text)" }}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} style={{ backgroundColor: "var(--kg-danger)", color: "white" }}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
