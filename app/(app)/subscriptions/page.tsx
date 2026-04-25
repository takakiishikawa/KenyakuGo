"use client";

import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";
import { Card, PageHeader, Skeleton } from "@takaki/go-design-system";
import type { SubscriptionItem } from "@/app/api/subscriptions/route";

function formatMonth(date: string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
      style={
        isActive
          ? {
              backgroundColor: "rgba(82,183,136,0.12)",
              color: "var(--kg-success)",
            }
          : {
              backgroundColor: "var(--kg-surface-2)",
              color: "var(--muted-foreground)",
            }
      }
    >
      {isActive ? "実行中" : "終了済み"}
    </span>
  );
}

function SubscriptionRow({ sub }: { sub: SubscriptionItem }) {
  return (
    <div
      className="flex items-center gap-4 px-7 py-4 border-b last:border-0"
      style={{ borderColor: "var(--kg-border-subtle)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {sub.store}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">
          {sub.monthsActive}ヶ月継続 · 最終課金:{" "}
          {formatMonth(sub.lastChargedAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-num text-sm font-semibold text-foreground">
          {formatVND(sub.amount)}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">/月</p>
      </div>
      <StatusBadge isActive={sub.isActive} />
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[] | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((data) => setSubscriptions(data as SubscriptionItem[]));
  }, []);

  const active = subscriptions?.filter((s) => s.isActive) ?? [];
  const ended = subscriptions?.filter((s) => !s.isActive) ?? [];
  const monthlyTotal = active.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      <PageHeader title="サブスク一覧" />

      {subscriptions === null ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            「サブスク」カテゴリの取引がありません
          </p>
          <p className="text-xs mt-2 text-muted-foreground">
            取引一覧でカテゴリを「サブスク」に設定すると自動で表示されます
          </p>
        </Card>
      ) : (
        <div className="mt-8 space-y-8">
          {active.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  実行中 — {active.length}件
                </p>
                <p
                  className="text-sm font-num font-semibold"
                  style={{ color: "var(--color-primary)" }}
                >
                  月額合計 {formatVND(monthlyTotal)}
                </p>
              </div>
              <Card className="animate-fade-up">
                {active.map((sub) => (
                  <SubscriptionRow key={sub.store} sub={sub} />
                ))}
              </Card>
            </section>
          )}

          {ended.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                終了済み — {ended.length}件
              </p>
              <Card className="animate-fade-up" style={{ opacity: 0.65 }}>
                {ended.map((sub) => (
                  <SubscriptionRow key={sub.store} sub={sub} />
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
