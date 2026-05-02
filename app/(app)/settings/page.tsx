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
import { toast } from "@takaki/go-design-system";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [month, setMonth] = useState<string>("");
  const [targetMonthly, setTargetMonthly] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    synced: number;
    deleted: number;
    totalMissing: number;
  } | null>(null);

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
        setMonth(data.month);
        setTargetMonthly(String(data.targetMonthly));
        setFixedCosts(String(data.fixedCosts));
      });
  }, []);

  const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7), 10)}月` : "";

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

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillProgress({ synced: 0, deleted: 0, totalMissing: 0 });
    let totalSynced = 0;
    let totalDeleted = 0;
    let totalMissing = 0;
    try {
      while (true) {
        const r = await fetch("/api/gmail/backfill", { method: "POST" });
        if (!r.ok) {
          const { error } = await r.json().catch(() => ({ error: "" }));
          throw new Error(error || "再取り込みに失敗しました");
        }
        const data = (await r.json()) as {
          deleted: number;
          synced: number;
          remaining: number;
          totalMissing: number;
        };
        totalDeleted += data.deleted;
        totalSynced += data.synced;
        totalMissing = totalSynced + data.remaining;
        setBackfillProgress({
          synced: totalSynced,
          deleted: totalDeleted,
          totalMissing,
        });
        if (data.remaining === 0) break;
      }

      // 取り込み直後の「その他」を AI で一括カテゴリ分類。
      // synced=0（再ボタン押下時）でも未分類があれば走らせる。
      let aiSummary = "";
      try {
        const cat = await fetch("/api/ai/categorize-all", { method: "POST" });
        if (cat.ok) {
          const { updated, total } = (await cat.json()) as {
            updated: number;
            total: number;
          };
          if (total > 0) aiSummary = ` / AI分類 ${updated}/${total} 件`;
        }
      } catch {
        // 分類失敗時はスキップ（手動でも実行可能）
      }

      toast.success(
        `再取り込み完了: ${totalSynced} 件追加${aiSummary}${totalDeleted > 0 ? ` / ${totalDeleted} 件のゴミレコード削除` : ""}`,
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "再取り込みに失敗しました",
      );
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div>
      <PageHeader title="設定" />

      <div className="mt-8 space-y-5 max-w-xl">
        <Card className="p-7 animate-fade-up">
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              今月の予算
            </p>
            {monthLabel && (
              <p className="text-xs font-num text-muted-foreground">
                {monthLabel}
              </p>
            )}
          </div>
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
            <p className="text-xs text-muted-foreground">
              ※ 変更は今月（{monthLabel}）にのみ反映されます。過去月の予算は変更できません。月別履歴は「レポート」ページの「月毎の倹約」から確認できます。
            </p>
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
          style={{ animationDelay: "160ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-2 text-muted-foreground">
            データ復旧
          </p>
          <p className="text-sm mb-5 text-muted-foreground">
            Gmail から全期間のメールを再取得して、不足している取引（過去の外貨取引など）を取り込みます。既存の取引は重複しません。
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfilling}
          >
            <RefreshCw
              size={14}
              className={backfilling ? "animate-spin" : ""}
            />
            {backfilling ? "再取り込み中..." : "Gmail 全期間を再取り込み"}
          </Button>
          {backfillProgress && (
            <p className="text-xs mt-3 text-muted-foreground">
              {backfilling ? "進行中: " : "完了: "}
              {backfillProgress.synced} 件追加
              {backfillProgress.deleted > 0 &&
                ` / ${backfillProgress.deleted} 件のゴミレコード削除`}
              {backfilling &&
                backfillProgress.totalMissing > 0 &&
                ` (${backfillProgress.synced}/${backfillProgress.totalMissing})`}
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{
            animationDelay: "240ms",
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
