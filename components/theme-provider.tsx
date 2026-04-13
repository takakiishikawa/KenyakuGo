"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("kg-theme") as Theme | null;
    const detected: Theme = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(detected);
    setTheme(detected);

    if (!saved) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        if (localStorage.getItem("kg-theme")) return;
        const next: Theme = e.matches ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("kg-theme", next);
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
      style={{
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.7)",
      }}
      title={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.15)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)")}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
