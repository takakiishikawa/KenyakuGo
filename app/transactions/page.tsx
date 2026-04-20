"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { formatVND, formatDateWithYear } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";
import {
  Button, Card, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tabs, TabsList, TabsTrigger,
  PageHeader,
} from "@takaki/go-design-system";

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
  totalAmount: number;
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
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

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
    try {
      const res = await fetch("/api/ai/categorize-all", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { updated, total } = await res.json();
      toast.success(`${total}件中${updated}件のカテゴリを更新しました`);
      fetchTransactions();
      fetchCategories();
      fetchUncategorizedCount();
    } catch (e) {
      toast.error(`分類に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setCategorizing(false);
    }
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
    else if (res.ok) { toast.success(`「${newCategoryName.trim()}」を追加しました`); setNewCategoryName(""); setShowAddCategory(false); fetchCategories(); }
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

  const handleBulkApply = async () => {
    if (!bulkCategory || !searchQuery.trim()) return;
    setBulkApplying(true);
    try {
      const res = await fetch("/api/transactions/reclassify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), category: bulkCategory }),
      });
      const { updated, error } = await res.json();
      if (error) throw new Error(error);
      toast.success(`「${searchQuery}」を含む${updated}件を「${bulkCategory}」に変更しました`);
      fetchTransactions();
      fetchCategories();
      fetchUncategorizedCount();
    } catch (e) {
      toast.error(`変更失敗: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setBulkApplying(false);
    }
  };

  const filteredTransactions = searchQuery.trim()
    ? transactions.filter((tx) => tx.store.toLowerCase().includes(searchQuery.toLowerCase()))
    : transactions;

  const allCategorized = uncategorizedCount === 0;

  return (
    <div>
      <PageHeader
        title="取引一覧"
        actions={
          <div className="flex gap-2">
            {allCategorized ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium"
                style={{ color: "var(--kg-success)", backgroundColor: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <span>✓</span>
                <span>全て分類済み</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUncategorizedStores}
                disabled={reviewLoading}
                style={uncategorizedCount && uncategorizedCount > 0 ? {
                  borderColor: "rgba(255,183,77,0.35)",
                  color: "var(--kg-warning)",
                  backgroundColor: "rgba(255,183,77,0.08)",
                } : undefined}
              >
                {reviewLoading ? "読込中..." : `要確認リスト${uncategorizedCount ? `（${uncategorizedCount}）` : ""}`}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleCategorizeAll}
              disabled={categorizing || allCategorized}
              variant={allCategorized ? "outline" : "default"}
            >
              {categorizing ? "分類中..." : "AI一括分類"}
            </Button>
          </div>
        }
      />

      {/* 要確認ストア */}
      {uncategorizedStores.length > 0 && (
        <Card className="mt-8 mb-6" style={{ border: "1px solid rgba(255,183,77,0.2)", background: "rgba(255,183,77,0.04)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,183,77,0.15)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-warning)" }}>
              ⚠ 要確認ストア（{uncategorizedStores.length}件）
            </p>
          </div>
          {uncategorizedStores.map((s) => (
            <div key={s.store} className="flex items-center gap-3 px-6 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,183,77,0.1)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--kg-text)" }}>{s.store}</p>
                <p className="text-xs text-muted-foreground">{s.count}件 · {formatVND(s.totalAmount)}</p>
              </div>
              {s.hint && (
                <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: "rgba(255,183,77,0.12)", color: "var(--kg-warning)" }}>
                  {s.hint}
                </span>
              )}
              <Select
                value={reviewSelections[s.store] || undefined}
                onValueChange={(val) => setReviewSelections((prev) => ({ ...prev, [s.store]: val }))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="カテゴリ選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => handleApplyStore(s.store)}
                disabled={!reviewSelections[s.store] || applyingStore === s.store}
              >
                {applyingStore === s.store ? "適用中..." : "全件適用"}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {/* 検索 + カテゴリ追加 */}
      <div className={`flex gap-3 mb-5 ${uncategorizedStores.length === 0 ? "mt-8" : ""}`}>
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="店名で検索..."
            className="pl-9"
          />
        </div>
        {showAddCategory ? (
          <div className="flex gap-2">
            <Input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") { setShowAddCategory(false); setNewCategoryName(""); } }}
              placeholder="カテゴリ名..."
              autoFocus
              className="w-44"
            />
            <Button
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategoryName.trim()}
              size="sm"
            >
              {addingCategory ? "..." : "追加"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCategory(true)}
          >
            + カテゴリ追加
          </Button>
        )}
      </div>

      {/* 一括カテゴリ変更バナー */}
      {searchQuery.trim() && filteredTransactions.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 mb-4 rounded-md"
          style={{ backgroundColor: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <p className="text-sm flex-1 text-muted-foreground">
            <span className="font-medium text-foreground">「{searchQuery}」</span>
            を含む{filteredTransactions.length}件を一括変更:
          </p>
          <Select
            value={bulkCategory || undefined}
            onValueChange={setBulkCategory}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="カテゴリ選択" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleBulkApply}
            disabled={!bulkCategory || bulkApplying}
          >
            {bulkApplying ? "変更中..." : "一括変更"}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="week">今週</TabsTrigger>
            <TabsTrigger value="month">今月</TabsTrigger>
            <TabsTrigger value="all">全期間</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {filteredTransactions.length}件の取引{searchQuery.trim() ? ` — 「${searchQuery}」で絞り込み中` : ""}
          </p>
        </div>
        {filteredTransactions.length > 0 ? (
          <div>
            {filteredTransactions.map((tx) => {
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
                      <Select
                        value={editCategory}
                        onValueChange={setEditCategory}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCategory(tx)}
                        disabled={savingId === tx.id}
                      >
                        {savingId === tx.id ? "…" : "保存"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>✕</Button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(tx.id); setEditCategory(tx.category); }} className="cursor-pointer">
                      <CategoryBadge category={tx.category} />
                    </button>
                  )}
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--kg-text)" }}>{tx.store}</span>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-num font-semibold" style={{ color: "var(--kg-text)" }}>{formatVND(tx.amount)}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{formatDateWithYear(tx.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-16 text-sm text-muted-foreground">
            {searchQuery.trim() ? `「${searchQuery}」に一致する取引はありません` : "取引データがありません"}
          </p>
        )}
      </Card>
    </div>
  );
}
