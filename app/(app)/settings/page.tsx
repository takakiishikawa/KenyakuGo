"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
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
  Button,
  Card,
  Input,
  PageHeader,
} from "@takaki/go-design-system";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [targetMonthly, setTargetMonthly] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setUser(user));
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
      <PageHeader title="設定" />

      <div className="mt-8 space-y-5 max-w-xl">
        <Card className="p-7 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-widest mb-6 text-muted-foreground">
            予算設定
          </p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                合計月支出（VND）
              </label>
              <Input
                type="number"
                value={targetMonthly}
                onChange={(e) => setTargetMonthly(e.target.value)}
                placeholder="例: 50000000"
              />
              {parseInt(targetMonthly) > 0 && (
                <p
                  className="text-xs mt-2 font-num"
                  style={{ color: "var(--kg-accent)" }}
                >
                  = {parseInt(targetMonthly).toLocaleString("vi-VN")} ₫
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                固定費（VND）
              </label>
              <Input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(e.target.value)}
                placeholder="例: 17000000"
              />
              {parseInt(fixedCosts) > 0 && (
                <p
                  className="text-xs mt-2 font-num"
                  style={{ color: "var(--kg-accent)" }}
                >
                  = {parseInt(fixedCosts).toLocaleString("vi-VN")} ₫
                </p>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </div>
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-5 text-muted-foreground">
            Googleアカウント
          </p>
          {user ? (
            <div className="flex items-center gap-4">
              {user.user_metadata?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.user_metadata.avatar_url as string}
                  alt="avatar"
                  className="w-12 h-12 rounded-full"
                  style={{
                    outline: "2px solid var(--kg-accent)",
                    outlineOffset: "2px",
                  }}
                />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.user_metadata?.full_name as string}
                </p>
                <p className="text-xs mt-0.5 text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ログインしていません
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{
            animationDelay: "160ms",
            border: "1px solid var(--color-danger-alpha-20)",
            background: "var(--color-danger-alpha-04)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} style={{ color: "var(--kg-danger)" }} />
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--kg-danger)" }}
            >
              危険ゾーン
            </p>
          </div>
          <p className="text-sm mb-5 text-muted-foreground">
            全ての取引データを削除します。この操作は取り消せません。
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/20"
              >
                全取引データを削除
              </Button>
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
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </div>
  );
}