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

const CATEGORIES = [
  "食費（外食）",
  "食費（自炊）",
  "固定費",
  "マッサージ・スパ",
  "エンタメ",
  "引き出し（現金）",
  "その他",
];

interface Transaction {
  id: string;
  store: string;
  amount: number;
  category: string;
  date: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams({ period });
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data);
  }, [period, categoryFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
      <h1 className="text-2xl font-bold mb-8" style={{ color: "#1A1A2E" }}>
        取引一覧
      </h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Period tabs */}
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

        {/* Category select */}
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {CATEGORIES.map((cat) => (
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
                  {CATEGORIES.map((cat) => (
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
