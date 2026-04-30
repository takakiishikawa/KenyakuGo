"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppSwitcher,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  UserMenu,
} from "@takaki/go-design-system";
import {
  LayoutDashboard,
  BarChart2,
  List,
  Droplets,
  BookOpen,
  Sun,
  Moon,
  Lightbulb,
  Repeat2,
  Settings,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const GO_APPS = [
  { name: "MetaGo", url: "https://metago.vercel.app/", color: "#1E3A8A" },
  { name: "NativeGo", url: "https://english-learning-app-black.vercel.app/", color: "#0052CC" },
  { name: "CareGo", url: "https://care-go-mu.vercel.app/dashboard", color: "#00875A" },
  { name: "KenyakuGo", url: "https://kenyaku-go.vercel.app/", color: "#FF5630" },
  { name: "CookGo", url: "https://cook-go-lovat.vercel.app/dashboard", color: "#FF991F" },
  { name: "PhysicalGo", url: "https://physical-go.vercel.app/dashboard", color: "#6554C0" },
  { name: "TaskGo", url: "https://taskgo-dun.vercel.app/", color: "#00B8D9" },
  { name: "DesignSystem", url: "https://github.com/takakiishikawa/go-design-system", color: "#7C3AED" },
];

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/subscriptions", label: "サブスク", icon: Repeat2 },
  { href: "/dam", label: "貴蓄ダム", icon: Droplets },
  { href: "/column", label: "マインドセット", icon: BookOpen },
];

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function KenyakuGoSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("kg-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

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

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = fullName || user?.email?.split("@")[0] || "";

  return (
    <Sidebar>
      <SidebarHeader>
        <AppSwitcher currentApp="KenyakuGo" apps={GO_APPS} placement="bottom" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user ? (
          <UserMenu
            displayName={displayName || "—"}
            email={user.email ?? undefined}
            avatarUrl={avatarUrl}
            items={[
              {
                title: "コンセプト",
                icon: Lightbulb,
                onSelect: () => router.push("/concept"),
                isActive: isActive("/concept"),
              },
              {
                title: "設定",
                icon: Settings,
                onSelect: () => router.push("/settings"),
                isActive: isActive("/settings"),
              },
              {
                title: isDark ? "ダーク" : "ライト",
                icon: isDark ? Moon : Sun,
                onSelect: toggleTheme,
              },
            ]}
            signOut={{ onSelect: handleSignOut }}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleTheme}
                className="cursor-pointer"
              >
                {isDark ? (
                  <Moon className="h-4 w-4 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0" />
                )}
                {isDark ? "ダーク" : "ライト"}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignIn}
                className="cursor-pointer"
              >
                <span className="text-sm">Googleでログイン</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}