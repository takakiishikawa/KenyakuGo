"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { formatVND, formatDate } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";

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
  hint: string | null;
}

function CategoryBadge({ category }: { category: string }) {
  const { bg, text } = getCategoryColors(category);
  const isUncategorized = category === "その他";
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: isUncategorized ? "rgba(239,83,80,0.15)" : bg,
        color: isUncategorized ? "#F87171" : text,
        border: `1px solid ${isUncategorized ? "rgba(239,83,80,0.25)" : "transparent"}`,
      }}
    >
      {isUncategorized ? "未分類" : category}
    </span>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [period, setPeriod] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // インライン編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // 要確認ストア
  const [uncategorizedStores, setUncategorizedStores] = useState<UncategorizedStore[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  const [applyingStore, setApplyingStore] = useState<string | null>(null);

  // カテゴリ追加
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  const fetchCategories = useCallback(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories((data as { name: string }[]).map((c) => c.name)));
  }, []);

  const fetchUncategorizedCount = useCallback(async () => {
    const res = await fetch("/api/transactions/uncategorized-count");
    const { count } = await res.json();
    setUncategorizedCount(count ?? 0);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchUncategorizedCount(); }, [fetchUncategorizedCount]);

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
    setUncategorizedCount(data.length);
    const defaults: Record<string, string> = {};
    for (const s of data) {
      if (s.suggested) defaults[s.store] = s.suggested;
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
    setUncategorizedStores((prev) => {
      const next = prev.filter((s) => s.store !== store);
      setUncategorizedCount(next.length);
      return next;
    });
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
    fetchUncategorizedCount();
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

  const handleSaveCategory = async (tx: Transaction) => {
    if (!editCategory || editCategory === tx.category) {
      setEditingId(null);
      return;
    }
    setSavingId(tx.id);
    await fetch(`/api/transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: editCategory }),
    });
    toast.success("カテゴリを更新しました");
    setSavingId(null);
    setEditingId(null);
    fetchTransactions();
  };

  const periodTabs = [
    { value: "week", label: "今週" },
    { value: "month", label: "今月" },
    { value: "all", label: "全期間" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-display text-4xl" style={{ color: "#E8F5E9" }}>
          取引一覧
        </h1>
        <div className="flex gap-3">
          <button
            onClick={fetchUncategorizedStores}
            disabled={reviewLoading}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-50"
            style={{
              border: "1px solid rgba(82,183,136,0.3)",
              color: uncategorizedCount && uncategorizedCount > 0 ? "#FFB74D" : "#52B788",
              borderColor: uncategorizedCount && uncategorizedCount > 0 ? "rgba(255,183,77,0.3)" : "rgba(82,183,136,0.3)",
              backgroundColor: uncategorizedCount && uncategorizedCount > 0 ? "rgba(255,183,77,0.08)" : "transparent",
            }}
          >
            {reviewLoading
              ? "読込中..."
              : `要確認リスト${uncategorizedCount !== null && uncategorizedCount > 0 ? `（${uncategorizedCount}）` : ""}`}
          </button>
          <button
            onClick={handleCategorizeAll}
            disabled={categorizing}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: "#52B788", color: "#0A0F0D" }}
          >
            {categorizing ? "分類中..." : "AI一括分類"}
          </button>
        </div>
      </div>

      {/* 要確認ストア */}
      {uncategorizedStores.length > 0 && (
        <div
          className="kg-card-static mb-6 animate-fade-up"
          style={{ border: "1px solid rgba(255,183,77,0.2)", background: "rgba(255,183,77,0.04)" }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,183,77,0.15)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#FFB74D" }}>
              ⚠ 要確認ストア（{uncategorizedStores.length}件）
            </p>
          </div>
          {uncategorizedStores.map((s) => (
            <div
              key={s.store}
              className="flex items-center gap-3 px-6 py-3 border-b last:border-0"
              style={{ borderColor: "rgba(255,183,77,0.1)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#E8F5E9" }}>{s.store}</p>
                <p className="text-xs" style={{ color: "#6B8F71" }}>{s.count}件</p>
              </div>
              {s.hint && (
                <span
                  className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: "rgba(255,183,77,0.12)", color: "#FFB74D" }}
                >
                  {s.hint}
                </span>
              )}
              <select
                value={reviewSelections[s.store] ?? ""}
                onChange={(e) =>
                  setReviewSelections((prev) => ({ ...prev, [s.store]: e.target.value }))
                }
                className="text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{
                  backgroundColor: "#1A2A1E",
                  border: "1px solid rgba(82,183,136,0.25)",
                  color: "#E8F5E9",
                  minWidth: 140,
                }}
              >
                <option value="">カテゴリ選択</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => handleApplyStore(s.store)}
                disabled={!reviewSelections[s.store] || applyingStore === s.store}
                className="px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-40 whitespace-nowrap transition-all"
                style={{ backgroundColor: "#52B788", color: "#0A0F0D" }}
              >
                {applyingStore === s.store ? "適用中..." : "全件適用"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* カテゴリ追加 */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          placeholder="新しいカテゴリ名..."
          className="kg-input flex-1"
          style={{ maxWidth: 280 }}
        />
        <button
          onClick={handleAddCategory}
          disabled={addingCategory || !newCategoryName.trim()}
          className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-40"
          style={{
            backgroundColor: "#1A2A1E",
            color: "#52B788",
            border: "1px solid rgba(82,183,136,0.3)",
          }}
        >
          + 追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(82,183,136,0.15)", backgroundColor: "#111A14" }}
        >
          {periodTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="px-5 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: period === tab.value ? "#52B788" : "transparent",
                color: period === tab.value ? "#0A0F0D" : "#6B8F71",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 outline-none"
          style={{
            backgroundColor: "#111A14",
            border: "1px solid rgba(82,183,136,0.15)",
            color: "#E8F5E9",
          }}
        >
          <option value="all">すべてのカテゴリ</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Transaction List */}
      <div className="kg-card-static animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="px-7 py-5 border-b" style={{ borderColor: "rgba(82,183,136,0.1)" }}>
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B8F71" }}>
            {transactions.length}件の取引
          </p>
        </div>
        {transactions.length > 0 ? (
          <div>
            {transactions.map((tx) => {
              const isUncategorized = tx.category === "その他";
              const isEditing = editingId === tx.id;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-7 py-4 border-b last:border-0 transition-colors"
                  style={{
                    borderColor: "rgba(82,183,136,0.08)",
                    borderLeft: isUncategorized ? "3px solid rgba(255,183,77,0.5)" : "3px solid transparent",
                    backgroundColor: isUncategorized ? "rgba(255,183,77,0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isEditing)
                      (e.currentTarget as HTMLElement).style.backgroundColor = isUncategorized
                        ? "rgba(255,183,77,0.06)"
                        : "#1A2A1E";
                  }}
                  onMouseLeave={(e) => {
                    if (!isEditing)
                      (e.currentTarget as HTMLElement).style.backgroundColor = isUncategorized
                        ? "rgba(255,183,77,0.03)"
                        : "transparent";
                  }}
                >
                  {/* Category — click to edit */}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        autoFocus
                        className="text-xs rounded-lg px-2 py-1.5 outline-none"
                        style={{
                          backgroundColor: "#1A2A1E",
                          border: "1px solid rgba(82,183,136,0.4)",
                          color: "#E8F5E9",
                          minWidth: 130,
                        }}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveCategory(tx)}
                        disabled={savingId === tx.id}
                        className="px-2.5 py-1 text-xs rounded-lg font-medium disabled:opacity-40"
                        style={{ backgroundColor: "#52B788", color: "#0A0F0D" }}
                      >
                        {savingId === tx.id ? "…" : "保存"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs rounded-lg"
                        style={{ color: "#6B8F71" }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(tx.id);
                        setEditCategory(tx.category);
                      }}
                      className="cursor-pointer"
                    >
                      <CategoryBadge category={tx.category} />
                    </button>
                  )}

                  <span className="text-sm font-medium flex-1 truncate" style={{ color: "#E8F5E9" }}>
                    {tx.store}
                  </span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-num font-semibold" style={{ color: "#E8F5E9" }}>
                      {formatVND(tx.amount)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#6B8F71" }}>
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-16 text-sm" style={{ color: "#6B8F71" }}>
            取引データがありません
          </p>
        )}
      </div>
    </div>
  );
}
