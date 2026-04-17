"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, List, BarChart2, Droplets, Settings, BookOpen, ChevronUp, Grid2x2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-provider";
import type { User } from "@supabase/supabase-js";

const GO_APPS = [
  { name: "NativeGo",   url: "https://english-learning-app-black.vercel.app/",   color: "#E5484D" },
  { name: "CareGo",     url: "https://care-go-mu.vercel.app/dashboard",           color: "#30A46C" },
  { name: "KenyakuGo",  url: "https://kenyaku-go.vercel.app/",                    color: "#F5A623" },
  { name: "TaskGo",     url: "https://taskgo-dun.vercel.app/",                    color: "#5E6AD2" },
  { name: "CookGo",     url: "https://cook-go-lovat.vercel.app/dashboard",        color: "#1AD1A5" },
  { name: "PhysicalGo", url: "https://physical-go.vercel.app/dashboard",          color: "#FF6B6B" },
];

const CURRENT_APP = "KenyakuGo";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/dam", label: "貯蓄ダム", icon: Droplets },
  { href: "/column", label: "マインドセット", icon: BookOpen },
  { href: "/settings", label: "設定", icon: Settings },
];

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appsOpen, setAppsOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
        background: "#1E3D26",
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
                background: isActive ? "linear-gradient(135deg, rgba(82,183,136,0.35) 0%, rgba(45,106,79,0.2) 100%)" : "transparent",
                border: isActive ? "1px solid rgba(82,183,136,0.35)" : "1px solid transparent",
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

      {/* App switcher + User area — pinned to bottom */}
      <div
        className="absolute"
        style={{ bottom: 24, left: 16, right: 16 }}
      >
        {/* Goシリーズ ドロップアップ */}
        <div ref={appsRef} className="relative mb-2">
          <button
            onClick={() => setAppsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
            style={{
              color: appsOpen ? "#52B788" : "rgba(255,255,255,0.45)",
              backgroundColor: appsOpen ? "rgba(82,183,136,0.08)" : "transparent",
              border: "1px solid",
              borderColor: appsOpen ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.07)",
            }}
            onMouseEnter={(e) => {
              if (!appsOpen) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (!appsOpen) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <span className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <Grid2x2 size={14} />
              Goシリーズ
            </span>
            <ChevronUp
              size={13}
              style={{
                transition: "transform 0.2s",
                transform: appsOpen ? "rotate(0deg)" : "rotate(180deg)",
                opacity: 0.5,
              }}
            />
          </button>

          {/* ドロップアップパネル */}
          {appsOpen && (
            <div
              className="absolute left-0 right-0 rounded-xl overflow-hidden"
              style={{
                bottom: "calc(100% + 6px)",
                backgroundColor: "#0F1E14",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 -8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {GO_APPS.map((app) => {
                const isCurrent = app.name === CURRENT_APP;
                return isCurrent ? (
                  <div
                    key={app.name}
                    className="flex items-center gap-2.5 px-3 py-2.5"
                    style={{
                      backgroundColor: "rgba(82,183,136,0.1)",
                      borderLeft: `3px solid ${app.color}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: app.color }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{app.name}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(82,183,136,0.2)", color: "#52B788", fontSize: 10 }}>
                      現在
                    </span>
                  </div>
                ) : (
                  <a
                    key={app.name}
                    href={app.url}
                    onClick={() => setAppsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 13,
                      borderLeft: "3px solid transparent",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
                      (e.currentTarget as HTMLElement).style.borderLeftColor = app.color;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                      (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: app.color }} />
                    {app.name}
                  </a>
                );
              })}
            </div>
          )}
        </div>
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
