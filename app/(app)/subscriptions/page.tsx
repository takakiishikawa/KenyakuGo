"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  Button,
  Card,
  PageHeader,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
} from "@takaki/go-design-system";
import type { SubscriptionItem } from "@/app/api/subscriptions/route";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
          {sub.category} · 最終課金: {formatDate(sub.lastChargedAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-num text-sm font-semibold text-foreground">
          {formatVND(sub.amount)}
        </p>
        <p className="text-xs mt-0.5 text-muted-foreground">/月</p>
      </div>
    </div>
  );
}

function ReviewRow({
  sub,
  onConfirm,
  pending,
}: {
  sub: SubscriptionItem;
  onConfirm: (store: string, judgment: "sub" | "not_sub") => void;
  pending: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
      style={{ borderColor: "var(--color-warning)" }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: "var(--kg-text)" }}
        >
          {sub.store}
        </p>
        <p className="text-sm text-muted-foreground">
          {sub.category} · {formatVND(sub.amount)} · 最終課金:{" "}
          {formatDate(sub.lastChargedAt)}
        </p>
      </div>
      {sub.reasoning && (
        <span
          className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
          style={{
            backgroundColor: "var(--color-warning-subtle)",
            color: "var(--color-warning)",
          }}
        >
          {sub.reasoning}
        </span>
      )}
      <Button
        size="sm"
        onClick={() => onConfirm(sub.store, "sub")}
        disabled={pending}
      >
        サブスク認定
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onConfirm(sub.store, "not_sub")}
        disabled={pending}
      >
        除外
      </Button>
    </div>
  );
}

type TabValue = "active" | "ended" | "review";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[] | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabValue>("active");
  const [pendingStore, setPendingStore] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/subscriptions");
      if (!r.ok) throw new Error();
      const data = (await r.json()) as SubscriptionItem[];
      setSubscriptions(data);
    } catch {
      toast.error("サブスク一覧の取得に失敗しました");
      setSubscriptions([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/subscriptions", { method: "POST" });
      if (!r.ok) throw new Error();
      const data = (await r.json()) as SubscriptionItem[];
      setSubscriptions(data);
      toast.success("AI で再判定しました");
    } catch {
      toast.error("再判定に失敗しました");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const confirm = useCallback(
    async (store: string, judgment: "sub" | "not_sub") => {
      setPendingStore(store);
      try {
        const r = await fetch("/api/subscriptions/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store, judgment }),
        });
        if (!r.ok) throw new Error();
        toast.success(
          judgment === "sub"
            ? `「${store}」をサブスクに認定しました`
            : `「${store}」を除外しました`,
        );
        await load();
      } catch {
        toast.error("更新に失敗しました");
      } finally {
        setPendingStore(null);
      }
    },
    [load],
  );

  useEffect(() => {
    load();
  }, [load]);

  const { active, ended, review } = useMemo(() => {
    const list = subscriptions ?? [];
    return {
      active: list.filter((s) => s.judgment === "sub" && s.isActive),
      ended: list.filter((s) => s.judgment === "sub" && !s.isActive),
      review: list.filter((s) => s.judgment === "unknown"),
    };
  }, [subscriptions]);

  const monthlyTotal = active.reduce((sum, s) => sum + s.amount, 0);

  const TabBadge = ({ count }: { count: number }) => (
    <span
      className="ml-2 text-[10px] font-num px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: "var(--kg-surface-2)",
        color: "var(--muted-foreground)",
        minWidth: 18,
        textAlign: "center",
      }}
    >
      {count}
    </span>
  );

  return (
    <div>
      <PageHeader
        title="サブスク一覧"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing || subscriptions === null}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "AI判定中..." : "AIで再判定"}
          </Button>
        }
      />

      {subscriptions === null ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 mb-4 flex items-center justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
              <TabsList>
                <TabsTrigger value="active">
                  実行中
                  <TabBadge count={active.length} />
                </TabsTrigger>
                <TabsTrigger value="ended">
                  終了
                  <TabBadge count={ended.length} />
                </TabsTrigger>
                <TabsTrigger value="review">
                  要確認
                  <TabBadge count={review.length} />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {tab === "active" && active.length > 0 && (
              <p
                className="text-sm font-num font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                月額合計 {formatVND(monthlyTotal)}
              </p>
            )}
          </div>

          {tab === "active" &&
            (active.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  実行中のサブスクはありません
                </p>
              </Card>
            ) : (
              <Card className="animate-fade-up">
                {active.map((sub) => (
                  <SubscriptionRow key={sub.store} sub={sub} />
                ))}
              </Card>
            ))}

          {tab === "ended" &&
            (ended.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  終了したサブスクはありません
                </p>
              </Card>
            ) : (
              <Card className="animate-fade-up" style={{ opacity: 0.65 }}>
                {ended.map((sub) => (
                  <SubscriptionRow key={sub.store} sub={sub} />
                ))}
              </Card>
            ))}

          {tab === "review" &&
            (review.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  要確認の取引はありません
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  AI が判定に迷った直近30日の取引がここに並びます
                </p>
              </Card>
            ) : (
              <Card
                className="animate-fade-up"
                style={{
                  border: "1px solid var(--color-warning)",
                  background: "var(--color-warning-subtle)",
                }}
              >
                <div
                  className="px-6 py-4 border-b"
                  style={{ borderColor: "var(--color-warning)" }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-widest"
                    style={{ color: "var(--color-warning)" }}
                  >
                    ⚠ 要確認 — AI が判定できなかった取引
                  </p>
                </div>
                {review.map((sub) => (
                  <ReviewRow
                    key={sub.store}
                    sub={sub}
                    onConfirm={confirm}
                    pending={pendingStore === sub.store}
                  />
                ))}
              </Card>
            ))}
        </>
      )}
    </div>
  );
}
