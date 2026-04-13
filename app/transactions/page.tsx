"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatVND, formatDate } from "@/lib/format";
import { toast } from "sonner";

interface Transaction {
  id: string;
  store: string;
  amount: number;
  category: string;
  date: string;
}

interface UncategorizedStore {
  store: string;
  count: number;
  suggested: string | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [period, setPeriod] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [categorizing, setCategorizing] = useState(false);

  // 要確認ストア
  const [uncategorizedStores, setUncategorizedStores] = useState<UncategorizedStore[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  const [applyingStore, setApplyingStore] = useState<string | null>(null);

  // カテゴリ追加
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const fetchCategories = useCallback(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories((data as { name: string }[]).map((c) => c.name)));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams({ period });
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data);
  }, [period, categoryFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const fetchUncategorizedStores = useCallback(async () => {
    setReviewLoading(true);
    const res = await fetch("/api/transactions/uncategorized-stores");
    const data: UncategorizedStore[] = await res.json();
    setUncategorizedStores(data);
    // AI提案をデフォルト選択にセット
    const defaults: Record<string, string> = {};
    for (const s of data) {
      if (s.suggested) defaults[s.store] = s.suggested as string;
    }
    setReviewSelections(defaults);
    setReviewLoading(false);
  }, []);

  const handleApplyStore = async (store: string) => {
    const category = reviewSelections[store];
    if (!category) return;
    setApplyingStore(store);
    const res = await fetch("/api/transactions/reclassify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store, category }),
    });
    const { updated } = await res.json();
    toast.success(`「${store}」の${updated}件を「${category}」に更新しました`);
    setApplyingStore(null);
    setUncategorizedStores((prev) => prev.filter((s) => s.store !== store));
    fetchTransactions();
    fetchCategories();
  };

  const handleCategorizeAll = async () => {
    setCategorizing(true);
    const res = await fetch("/api/ai/categorize-all", { method: "POST" });
    const { updated, total } = await res.json();
    toast.success(`${total}件中${updated}件のカテゴリを更新しました`);
    setCategorizing(false);
    fetchTransactions();
    fetchCategories();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    if (res.status === 409) {
      toast.error("そのカテゴリはすでに存在します");
    } else if (res.ok) {
      toast.success(`「${newCategoryName.trim()}」を追加しました`);
      setNewCategoryName("");
      fetchCategories();
    }
    setAddingCategory(false);
  };

  const handleCategoryUpdate = async () => {
    if (!selected || !newCategory) return;
    await fetch(`/api/transactions/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });
    toast.success("カテゴリを更新しました");
    setSelected(null);
    fetchTransactions();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>
          取引一覧
        </h1>
        <div className="flex gap-2">
          <button
            onClick={fetchUncategorizedStores}
            disabled={reviewLoading}
            className="px-4 py-2 text-sm rounded-lg font-medium border disabled:opacity-50"
            style={{ borderColor: "#52B788", color: "#52B788" }}
          >
            {reviewLoading ? "読込中..." : "要確認リスト"}
          </button>
          <button
            onClick={handleCategorizeAll}
            disabled={categorizing}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: "#52B788" }}
          >
            {categorizing ? "分類中..." : "カテゴリ一括適用"}
          </button>
        </div>
      </div>

      {/* 要確認ストア */}
      {uncategorizedStores.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: "#92400E" }}>
              <span>⚠</span>
              繰り返し発生している未分類の店舗（{uncategorizedStores.length}件）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {uncategorizedStores.map((s) => (
              <div
                key={s.store}
                className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: "#FDE68A" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#1A1A2E" }}>
                    {s.store}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    {s.count}件
                  </p>
                </div>
                <Select
                  value={reviewSelections[s.store] ?? ""}
                  onValueChange={(v) =>
                    setReviewSelections((prev) => ({ ...prev, [s.store]: v ?? "" }))
                  }
                >
                  <SelectTrigger className="w-40 text-xs h-8">
                    <SelectValue placeholder="カテゴリ選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => handleApplyStore(s.store)}
                  disabled={!reviewSelections[s.store] || applyingStore === s.store}
                  className="px-3 py-1.5 text-xs rounded-lg text-white font-medium disabled:opacity-40 whitespace-nowrap"
                  style={{ backgroundColor: "#1B4332" }}
                >
                  {applyingStore === s.store ? "適用中..." : "適用（全件）"}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* カテゴリ追加 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          placeholder="新しいカテゴリ名..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none"
          style={{ borderColor: "#E5E7EB", color: "#1A1A2E" }}
        />
        <button
          onClick={handleAddCategory}
          disabled={addingCategory || !newCategoryName.trim()}
          className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-40"
          style={{ backgroundColor: "#1B4332" }}
        >
          + 追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#E5E7EB" }}>
          {[
            { value: "week", label: "今週" },
            { value: "month", label: "今月" },
            { value: "all", label: "全期間" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: period === tab.value ? "#1B4332" : "white",
                color: period === tab.value ? "white" : "#6B7280",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            {transactions.length}件の取引
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div>
              {transactions.map((tx) => {
                const isUncategorized = tx.category === "その他";
                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setSelected(tx);
                      setNewCategory(tx.category);
                    }}
                    className="flex items-center justify-between px-6 py-4 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      borderLeft: isUncategorized ? "3px solid #F59E0B" : "3px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{
                          backgroundColor: isUncategorized ? "#F59E0B" : "#52B788",
                          color: "white",
                        }}
                      >
                        {isUncategorized ? "未分類" : tx.category}
                      </Badge>
                      <span className="text-sm font-medium" style={{ color: "#1A1A2E" }}>
                        {tx.store}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: "#1A1A2E" }}>
                        {formatVND(tx.amount)}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: "#6B7280" }}>
              取引データがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Edit Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリを変更</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#6B7280" }}>
                {selected.store} — {formatVND(selected.amount)}
              </p>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleCategoryUpdate}
                className="w-full py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "#1B4332" }}
              >
                変更する
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
