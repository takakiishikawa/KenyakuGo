"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { DisplayCurrency } from "@/components/currency-switch";
import type { Lang } from "@/lib/scenario/dictionary";

const CURRENCY_KEY = "piggybank:displayCurrency";
const LANG_KEY = "piggybank:lang";

interface PreferencesValue {
  currency: DisplayCurrency;
  lang: Lang;
  toggleCurrency: () => void;
  toggleLang: () => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

// 通貨(¥/₫)・言語(ja/en)を全画面共通で保持する。単一ユーザー・単一ブラウザの
// 個人アプリなのでDBには保存せずlocalStorageのみ(サイドバーのトグルから変更)。
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<DisplayCurrency>("VND");
  const [lang, setLang] = useState<Lang>("ja");

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(CURRENCY_KEY);
    if (savedCurrency === "VND" || savedCurrency === "JPY") setCurrency(savedCurrency);
    const savedLang = window.localStorage.getItem(LANG_KEY);
    if (savedLang === "ja" || savedLang === "en") setLang(savedLang);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === "JPY" ? "VND" : "JPY";
      window.localStorage.setItem(CURRENCY_KEY, next);
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "ja" ? "en" : "ja";
      window.localStorage.setItem(LANG_KEY, next);
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ currency, lang, toggleCurrency, toggleLang }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
