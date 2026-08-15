"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  GO_APPS,
  cn,
} from "@takaki/go-design-system";
import {
  LayoutDashboard,
  BarChart2,
  Wallet,
  Target,
  LogOut,
  LogIn,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const AppSwitcher = dynamic(() =>
  import("@takaki/go-design-system").then((m) => ({ default: m.AppSwitcher })),
);

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/simulation", label: "Simulation", icon: Target },
  { href: "/weekly", label: "Report", icon: BarChart2 },
];

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// アイコンのみの省略形をデフォルトとするサイドバー(ログラス等の管理画面に近い、
// コンテンツ領域を最大化する方針)。ユーザー名・メール・アバターは表示せず、
// ログイン/ログアウトのボタンだけを置く。展開時以外はホバーでtooltip表示。
export function PiggyBankSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

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
    <Sidebar
      collapsible="icon"
      style={{ backgroundColor: "var(--kg-sidebar-bg)", borderColor: "var(--kg-sidebar-border)" }}
      className="border-r"
    >
      <SidebarHeader>
        <AppSwitcher currentApp="PiggyBank" apps={GO_APPS} placement="bottom" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className={cn(
                        "h-auto rounded-[9px] py-2.5 px-3 transition-all active:scale-[0.97]",
                        active && "hover:brightness-95 active:brightness-90",
                      )}
                      style={active ? { backgroundColor: "var(--kg-sidebar-accent-bg)" } : undefined}
                    >
                      <Link href={href} className="gap-2.5">
                        <Icon
                          size={17}
                          className="shrink-0"
                          style={{ color: active ? "var(--kg-sidebar-active-icon)" : "var(--kg-sidebar-inactive)" }}
                        />
                        <span
                          className="text-sm"
                          style={{
                            fontWeight: active ? 600 : 500,
                            color: active ? "var(--kg-sidebar-text)" : "var(--kg-sidebar-inactive)",
                          }}
                        >
                          {label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <SidebarMenuButton
                onClick={handleSignOut}
                tooltip="Sign out"
                className="cursor-pointer"
              >
                <LogOut size={17} style={{ color: "var(--kg-sidebar-inactive)" }} />
                <span className="text-sm" style={{ color: "var(--kg-sidebar-inactive)" }}>
                  Sign out
                </span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                onClick={handleSignIn}
                tooltip="Sign in"
                className="cursor-pointer"
              >
                <LogIn size={17} style={{ color: "var(--kg-sidebar-inactive)" }} />
                <span className="text-sm" style={{ color: "var(--kg-sidebar-inactive)" }}>
                  Sign in
                </span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
