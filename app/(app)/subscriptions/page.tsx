"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";
import {
  Button,
  ChartArea,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  PageHeader,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Tag,
  toast,
  type ChartConfig,
} from "@takaki/go-design-system";
import type { SubscriptionItem } from "@/app/api/subscriptions/route";
import type { SubscriptionHistoryPoint } from "@/app/api/subscriptions/history/route";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CategoryBadge({ category }: { category: string }) {
  const { bg, text } = getCategoryColors(category);
  return (
    <Tag
      style={{ backgroundColor: bg, color: text, borderColor: "transparent" }}
    >
      {category}
    </Tag>
  );
}

type TabValue = "active" | "ended";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[] | null>(
    null,
  );
  const [tab, setTab] = useState<TabValue>("active");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SubscriptionHistoryPoint[] | null>(
    null,
  );

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

  useEffect(() => {
    load();
  }, [load]);

  // 推移は Dialog を開いた時に遅延取得
  useEffect(() => {
    if (!historyOpen || history !== null) return;
    fetch("/api/subscriptions/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: SubscriptionHistoryPoint[] | null) => {
        if (json) setHistory(json);
      });
  }, [historyOpen, history]);

  const { active, ended } = useMemo(() => {
    const list = subscriptions ?? [];
    // タグ（カテゴリ）昇順 → 同じタグ内は金額降順
    const sortByCategoryThenAmount = (a: SubscriptionItem, b: SubscriptionItem) => {
      const c = a.category.localeCompare(b.category, "ja");
      if (c !== 0) return c;
      return b.amount - a.amount;
    };
    return {
      active: list.filter((s) => s.isActive).sort(sortByCategoryThenAmount),
      ended: list.filter((s) => !s.isActive).sort(sortByCategoryThenAmount),
    };
  }, [subscriptions]);

  const monthlyTotal = active.reduce((sum, s) => sum + s.amount, 0);
  const tableData = tab === "active" ? active : ended;

  const columns = useMemo<ColumnDef<SubscriptionItem>[]>(
    () => [
      {
        id: "store",
        accessorKey: "store",
        header: "名前",
        cell: ({ row }) => (
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--kg-text)" }}
          >
            {row.original.store}
          </span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "タグ",
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        id: "lastChargedAt",
        accessorKey: "lastChargedAt",
        header: "最終課金",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.lastChargedAt)}
          </span>
        ),
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: () => <div className="text-right">金額</div>,
        cell: ({ row }) => (
          <div
            className="text-right font-num text-sm font-semibold"
            style={{ color: "var(--kg-text)" }}
          >
            {formatVND(row.original.amount)}
            <span className="text-xs ml-1 text-muted-foreground">/月</span>
          </div>
        ),
      },
    ],
    [],
  );

  const chartConfig = useMemo<ChartConfig>(
    () => ({ total: { label: "月額合計", color: "var(--color-primary)" } }),
    [],
  );

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
        title="サブスク"
        actions={
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <TrendingUp size={14} />
                推移
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="px-7 py-5 border-b">
                <DialogTitle>月額の推移（直近12ヶ月）</DialogTitle>
              </DialogHeader>
              <div className="p-7">
                {history === null ? (
                  <Skeleton className="h-72 w-full rounded" />
                ) : (
                  <ChartArea
                    data={history as unknown as Record<string, unknown>[]}
                    config={chartConfig}
                    xKey="label"
                    yKeys={["total"]}
                    filterByDate={false}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
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

          <div className="kg-hide-pagesize">
            <DataTable
              columns={columns}
              data={tableData}
              searchable={{ columnId: "store", placeholder: "店名で検索..." }}
              pageSize={100}
              pageSizeOptions={[100]}
              emptyMessage={
                tab === "active"
                  ? "実行中のサブスクはありません"
                  : "終了したサブスクはありません"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
