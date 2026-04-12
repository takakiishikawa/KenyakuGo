"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [targetMonthly, setTargetMonthly] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setTargetMonthly(String(data.targetMonthly));
        setFixedCosts(String(data.fixedCosts));
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetMonthly: parseInt(targetMonthly) || 0,
        fixedCosts: parseInt(fixedCosts) || 0,
      }),
    });
    toast.success("設定を保存しました");
    setSaving(false);
  };

  const handleDeleteAll = async () => {
    await fetch("/api/transactions/all", { method: "DELETE" });
    toast.success("全取引データを削除しました");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: "#1A1A2E" }}>
        設定
      </h1>

      <div className="space-y-6 max-w-xl">
        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
              予算設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#1A1A2E" }}>
                想定月支出（VND）
              </label>
              <input
                type="number"
                value={targetMonthly}
                onChange={(e) => setTargetMonthly(e.target.value)}
                placeholder="例: 10000000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#1A1A2E" }}>
                固定費合計（VND）
              </label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(e.target.value)}
                placeholder="例: 3000000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "#E5E7EB" }}
              />
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                家賃・借金返済などの合計
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#1B4332" }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </CardContent>
        </Card>

        {/* Google Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
              Googleアカウント
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.user_metadata.avatar_url as string}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>
                    {user.user_metadata?.full_name as string}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#6B7280" }}>
                ログインしていません
              </p>
            )}
          </CardContent>
        </Card>

        {/* Data Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ color: "#EF4444" }}>
              データリセット
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
              全ての取引データを削除します。この操作は取り消せません。
            </p>
            <AlertDialog>
              <AlertDialogTrigger
                className="px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "#EF4444" }}
              >
                全取引データを削除
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    全ての取引データが削除されます。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    style={{ backgroundColor: "#EF4444" }}
                  >
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
