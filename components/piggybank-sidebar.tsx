"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PiggyBank, LayoutGrid, Target, LogOut, LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { usePreferences } from "@/lib/preferences";

// Claude Design (PiggyBank.dc.html)のサイドバーを1:1で再現した、常時アイコンのみの
// 固定76px幅レール。go-design-systemのSidebar/SidebarProvider(展開/省略の
// 切り替え機構)はあえて使わず、デザイン通りの見た目に最適化したプレーンな実装にする。
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/simulation", label: "Simulation", icon: Target },
];

const DARK_BG = "#20242A";
const DARK_ACCENT_BG = "#2C3038";
const ACCENT = "#BE5B85";
const INACTIVE = "#9B9587";
const MUTED_TEXT = "#C7C2B7";

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function PiggyBankSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { currency, lang, toggleCurrency, toggleLang } = usePreferences();

  useEffect(() => {
    if (!supabaseConfigured) return;
    let sub: { unsubscribe: () => void } | undefined;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, session) => {
        setUser(session?.user ?? null);
      });
      sub = subscription;
    });
    return () => sub?.unsubscribe();
  }, []);

  const handleSignIn = () => router.push("/login");
  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div
      className="w-[76px] shrink-0 flex flex-col items-center py-[18px]"
      style={{ backgroundColor: DARK_BG }}
    >
      <div
        className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-[22px] shrink-0"
        style={{ backgroundColor: ACCENT }}
      >
        <PiggyBank size={18} color="#ffffff" />
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="w-12 h-[42px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: active ? ACCENT : "transparent" }}
            >
              <Icon size={18} color={active ? "#ffffff" : INACTIVE} />
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleLang}
        title="Language"
        className="w-[34px] h-7 rounded-lg flex items-center justify-center cursor-pointer mb-2 transition-all hover:brightness-110 active:scale-95 shrink-0"
        style={{ backgroundColor: DARK_ACCENT_BG, color: MUTED_TEXT, fontSize: 10.5, fontWeight: 700 }}
      >
        {lang.toUpperCase()}
      </button>
      <button
        type="button"
        onClick={toggleCurrency}
        title={currency === "JPY" ? "Japanese Yen" : "Vietnamese Dong"}
        className="w-[34px] h-7 rounded-lg flex items-center justify-center cursor-pointer mb-2 transition-all hover:brightness-110 active:scale-95 shrink-0"
        style={{ backgroundColor: DARK_ACCENT_BG, color: "#F5F1EA", fontSize: 13, fontWeight: 700 }}
      >
        {currency === "JPY" ? "¥" : "₫"}
      </button>

      {user ? (
        <button
          type="button"
          onClick={handleSignOut}
          title="Log out"
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-95 shrink-0"
          style={{ backgroundColor: DARK_ACCENT_BG }}
        >
          <LogOut size={15} color={MUTED_TEXT} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          title="Sign in"
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-95 shrink-0"
          style={{ backgroundColor: DARK_ACCENT_BG }}
        >
          <LogIn size={15} color={MUTED_TEXT} />
        </button>
      )}
    </div>
  );
}
