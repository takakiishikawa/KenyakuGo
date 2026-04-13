"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, List, BarChart2, Droplets, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KenyakuGoIcon } from "@/components/logo";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/dam", label: "貯蓄ダム", icon: Droplets },
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
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "KG";

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col"
      style={{ backgroundColor: "#0D1F12", borderRight: "1px solid rgba(82,183,136,0.12)" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 px-5 py-6 hover:opacity-80 transition-opacity"
      >
        <KenyakuGoIcon size={34} />
        <span
          className="font-display text-xl tracking-wide"
          style={{ color: "#52B788" }}
        >
          KenyakuGo
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
              style={{
                backgroundColor: isActive ? "#1A2A1E" : "transparent",
                borderLeft: isActive ? "3px solid #52B788" : "3px solid transparent",
                color: isActive ? "#52B788" : "#6B8F71",
                fontWeight: isActive ? "500" : "400",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#E8F5E9";
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(26,42,30,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#6B8F71";
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon size={17} />
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        className="p-4 mx-3 mb-4 rounded-xl"
        style={{ backgroundColor: "#1A2A1E", border: "1px solid rgba(82,183,136,0.1)" }}
      >
        {user ? (
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" style={{ outline: "2px solid #52B788", outlineOffset: "2px" }} />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ backgroundColor: "#52B788", color: "#0A0F0D" }}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "#E8F5E9" }}>
                {fullName ?? "User"}
              </p>
              <button
                onClick={handleSignOut}
                className="text-xs transition-colors"
                style={{ color: "#6B8F71" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#52B788")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6B8F71")}
              >
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full text-sm py-2 px-3 rounded-lg font-medium transition-all"
            style={{ backgroundColor: "#52B788", color: "#0A0F0D" }}
          >
            Googleでログイン
          </button>
        )}
      </div>
    </aside>
  );
}
