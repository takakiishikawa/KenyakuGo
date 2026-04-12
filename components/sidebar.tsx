"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, List, BarChart2, Droplets, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/dam", label: "ダム", icon: Droplets },
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
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

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col"
      style={{ backgroundColor: "#1B4332" }}
    >
      <div className="p-6">
        <h1 className="text-white text-xl font-bold tracking-wide">KenyakuGo</h1>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors"
              style={{
                backgroundColor: isActive ? "#52B788" : "transparent",
                color: "white",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "rgba(82,183,136,0.2)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "transparent";
              }}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-green-700">
        {user ? (
          <div className="flex items-center gap-3">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{fullName}</p>
              <button
                onClick={handleSignOut}
                className="text-green-300 text-xs hover:text-white transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full text-white text-sm py-2 px-3 rounded-lg transition-colors"
            style={{ backgroundColor: "#2D6A4F" }}
          >
            Googleでログイン
          </button>
        )}
      </div>
    </aside>
  );
}
