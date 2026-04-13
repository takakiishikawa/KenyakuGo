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
        backgroundColor: isUncategorized ? "rgba(239,83,80,0.12)" : bg,
        color: isUncategorized ? "var(--kg-danger)" : text,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uncategorizedStores, setUncategorizedStores] = useState<UncategorizedStore[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  const [applyingStore, setApplyingStore] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  const fetchCategories = useCallback(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) =>
      setCategories((data as { name: string }[]).map((c) => c.name)));
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
    setTransactions(await res.json());
  }, [period, categoryFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const fetchUncategorizedStores = useCallback(async () => {
    setReviewLoading(true);
    const data: UncategorizedStore[] = await fetch("/api/transactions/uncategorized-stores").then((r) => r.json());
    setUncategorizedStores(data);
    setUncategorizedCount(data.length);
    const defaults: Record<string, string> = {};
    for (const s of data) { if (s.suggested) defaults[s.store] = s.suggested; }
    setReviewSelections(defaults);
    setReviewLoading(false);
  }, []);

  const handleApplyStore = async (store: string) => {
    const category = reviewSelections[store];
    if (!category) return;
    setApplyingStore(store);
    const { updated } = await fetch("/api/transactions/reclassify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store, category }),
    }).then((r) => r.json());
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
    const { updated, total } = await fetch("/api/ai/categorize-all", { method: "POST" }).then((r) => r.json());
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
    if (res.status === 409) toast.error("そのカテゴリはすでに存在します");
    else if (res.ok) { toast.success(`「${newCategoryName.trim()}」を追加しました`); setNewCategoryName(""); fetchCategories(); }
    setAddingCategory(false);
  };

  const handleSaveCategory = async (tx: Transaction) => {
    if (!editCategory || editCategory === tx.category) { setEditingId(null); return; }
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

  const selectStyle = {
    backgroundColor: "var(--kg-surface-2)",
    border: "1px solid var(--kg-border-medium)",
    color: "var(--kg-text)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>取引一覧</h1>
        <div className="flex gap-3">
          <button
            onClick={fetchUncategorizedStores}
            disabled={reviewLoading}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-50"
            style={{
              border: `1px solid ${uncategorizedCount && uncategorizedCount > 0 ? "rgba(255,183,77,0.35)" : "var(--kg-border-medium)"}`,
              color: uncategorizedCount && uncategorizedCount > 0 ? "var(--kg-warning)" : "var(--kg-accent)",
              backgroundColor: uncategorizedCount && uncategorizedCount > 0 ? "rgba(255,183,77,0.08)" : "transparent",
            }}
          >
            {reviewLoading ? "読込中..." : `要確認リスト${uncategorizedCount ? `（${uncategorizedCount}）` : ""}`}
          </button>
          <button
            onClick={handleCategorizeAll}
            disabled={categorizing}
            className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--kg-accent)", color: "var(--kg-bg)" }}
          >
            {categorizing ? "分類中..." : "AI一括分類"}
          </button>
        </div>
      </div>

      {/* 要確認ストア */}
      {uncategorizedStores.length > 0 && (
        <div className="kg-card-static mb-6" style={{ border: "1px solid rgba(255,183,77,0.2)", background: "rgba(255,183,77,0.04)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,183,77,0.15)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-warning)" }}>
              ⚠ 要確認ストア（{uncategorizedStores.length}件）
            </p>
          </div>
          {uncategorizedStores.map((s) => (
            <div key={s.store} className="flex items-center gap-3 px-6 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,183,77,0.1)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--kg-text)" }}>{s.store}</p>
                <p className="text-xs" style={{ color: "var(--kg-text-muted)" }}>{s.count}件</p>
              </div>
              {s.hint && (
                <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: "rgba(255,183,77,0.12)", color: "var(--kg-warning)" }}>
                  {s.hint}
                </span>
              )}
              <select
                value={reviewSelections[s.store] ?? ""}
                onChange={(e) => setReviewSelections((prev) => ({ ...prev, [s.store]: e.target.value }))}
                style={{ ...selectStyle, minWidth: 140 }}
              >
                <option value="">カテゴリ選択</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button
                onClick={() => handleApplyStore(s.store)}
                disabled={!reviewSelections[s.store] || applyingStore === s.store}
                className="px-3 py-1.5 text-xs rounded-lg font-medium disabled:opacity-40 whitespace-nowrap"
                style={{ backgroundColor: "var(--kg-accent)", color: "var(--kg-bg)" }}
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
          className="kg-input"
          style={{ maxWidth: 280 }}
        />
        <button
          onClick={handleAddCategory}
          disabled={addingCategory || !newCategoryName.trim()}
          className="px-4 py-2 text-sm rounded-xl font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: "var(--kg-surface-2)", color: "var(--kg-accent)", border: "1px solid var(--kg-border-medium)" }}
        >
          + 追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--kg-border)", backgroundColor: "var(--kg-surface)" }}>
          {[{ value: "week", label: "今週" }, { value: "month", label: "今月" }, { value: "all", label: "全期間" }].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="px-5 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: period === tab.value ? "var(--kg-accent)" : "transparent",
                color: period === tab.value ? "var(--kg-bg)" : "var(--kg-text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="all">すべてのカテゴリ</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="kg-card-static">
        <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
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
                    borderColor: "var(--kg-border-subtle)",
                    borderLeft: isUncategorized ? "3px solid rgba(255,183,77,0.5)" : "3px solid transparent",
                    backgroundColor: isUncategorized ? "rgba(255,183,77,0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isEditing)
                      (e.currentTarget as HTMLElement).style.backgroundColor = isUncategorized ? "rgba(255,183,77,0.06)" : "var(--kg-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isEditing)
                      (e.currentTarget as HTMLElement).style.backgroundColor = isUncategorized ? "rgba(255,183,77,0.03)" : "transparent";
                  }}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        autoFocus
                        style={{ ...selectStyle, minWidth: 130 }}
                      >
                        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button
                        onClick={() => handleSaveCategory(tx)}
                        disabled={savingId === tx.id}
                        className="px-2.5 py-1 text-xs rounded-lg font-medium disabled:opacity-40"
                        style={{ backgroundColor: "var(--kg-accent)", color: "var(--kg-bg)" }}
                      >
                        {savingId === tx.id ? "…" : "保存"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded-lg" style={{ color: "var(--kg-text-muted)" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(tx.id); setEditCategory(tx.category); }} className="cursor-pointer">
                      <CategoryBadge category={tx.category} />
                    </button>
                  )}
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--kg-text)" }}>{tx.store}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-num font-semibold" style={{ color: "var(--kg-text)" }}>{formatVND(tx.amount)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kg-text-muted)" }}>{formatDate(tx.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-16 text-sm" style={{ color: "var(--kg-text-muted)" }}>取引データがありません</p>
        )}
      </div>
    </div>
  );
}
