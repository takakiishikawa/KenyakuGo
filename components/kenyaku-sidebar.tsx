"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@takaki/go-design-system";
import {
  LayoutDashboard,
  BarChart2,
  List,
  Droplets,
  BookOpen,
  Sun,
  Moon,
  ChevronsUpDown,
  Check,
  JapaneseYen,
  Lightbulb,
  Repeat2,
  Settings,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const UserMenu = dynamic(
  () =>
    import("@takaki/go-design-system").then((m) => ({ default: m.UserMenu })),
  { ssr: false },
);

const GO_APPS = [
  {
    name: "NativeGo",
    url: "https://english-learning-app-black.vercel.app/",
    color: "#0052CC",
  },
  {
    name: "CareGo",
    url: "https://care-go-mu.vercel.app/dashboard",
    color: "#30A46C",
  },
  {
    name: "KenyakuGo",
    url: "https://kenyaku-go.vercel.app/",
    color: "#1A7A4A",
  },
  { name: "TaskGo", url: "https://taskgo-dun.vercel.app/", color: "#5E6AD2" },
  {
    name: "CookGo",
    url: "https://cook-go-lovat.vercel.app/dashboard",
    color: "#1AD1A5",
  },
  {
    name: "PhysicalGo",
    url: "https://physical-go.vercel.app/dashboard",
    color: "#FF6B6B",
  },
  {
    name: "Design System",
    url: "https://go-design-system.vercel.app",
    color: "#6B7280",
  },
] as const;

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/weekly", label: "レポート", icon: BarChart2 },
  { href: "/transactions", label: "取引一覧", icon: List },
  { href: "/subscriptions", label: "サブスク", icon: Repeat2 },
  { href: "/dam", label: "貯蓄ダム", icon: Droplets },
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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
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

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
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
      {/* ヘッダー：ロゴ + アプリ切り替え */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <JapaneseYen className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5 leading-none min-w-0">
                    <span className="text-xs text-muted-foreground">App</span>
                    <span className="text-sm font-medium tracking-tight truncate">
                      KenyakuGo
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-52"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Goシリーズ
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {GO_APPS.map((app) => (
                  <DropdownMenuItem
                    key={app.name}
                    onSelect={() => {
                      window.location.href = app.url;
                    }}
                    className="gap-2"
                  >
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: app.color,
                      }}
                      aria-hidden
                    />
                    <span className="flex-1">{app.name}</span>
                    {app.name === "KenyakuGo" && (
                      <Check className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* メインナビ */}
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

      {/* フッター */}
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
