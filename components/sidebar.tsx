"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, List, BarChart2, Droplets, Settings, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-provider";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/dam", label: "貯蓄ダム", icon: Droplets },
  { href: "/column", label: "倹約コラム", icon: BookOpen },
  { href: "/settings", label: "設定", icon: Settings },
];

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = () => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "KG";

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col"
      style={{
        width: "260px",
        background: "linear-gradient(160deg, #1A3320 0%, #0F2318 40%, #0A1A10 100%)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-6 py-7 hover:opacity-90 transition-opacity"
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "linear-gradient(135deg, #52B788 0%, #2D6A4F 100%)",
          }}
        >
          <span className="text-base font-bold" style={{ color: "#1A2E1F" }}>¥</span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-noto), sans-serif",
            fontSize: 18,
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "0.02em",
          }}
        >
          KenyakuGo
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 transition-all duration-150"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: isActive ? "linear-gradient(135deg, rgba(82,183,136,0.25) 0%, rgba(45,106,79,0.15) 100%)" : "transparent",
                border: isActive ? "1px solid rgba(82,183,136,0.2)" : "1px solid transparent",
                color: isActive ? "#52B788" : "rgba(255,255,255,0.55)",
                fontWeight: isActive ? 500 : 400,
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = "rgba(255,255,255,0.85)";
                  el.style.backgroundColor = "rgba(255,255,255,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = "rgba(255,255,255,0.55)";
                  el.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon size={17} style={{ color: isActive ? "#52B788" : "rgba(255,255,255,0.45)" }} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User area — pinned to bottom */}
      <div
        className="absolute"
        style={{ bottom: 24, left: 16, right: 16 }}
      >
        {user ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)" }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="avatar"
                className="shrink-0 rounded-full"
                style={{ width: 36, height: 36, outline: "2px solid #52B788", outlineOffset: "2px" }}
              />
            ) : (
              <div
                className="shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ width: 36, height: 36, backgroundColor: "#52B788", color: "#1A2E1F" }}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                {fullName ?? "User"}
              </p>
              <button
                onClick={handleSignOut}
                className="transition-colors"
                style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#52B788")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
              >
                ログアウト
              </button>
            </div>
            <ThemeToggle />
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full text-sm py-2.5 px-4 rounded-xl font-medium transition-all"
            style={{ backgroundColor: "#52B788", color: "#1A2E1F" }}
          >
            Googleでログイン
          </button>
        )}
      </div>
    </aside>
  );
}
