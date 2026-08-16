import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PiggyBankSidebar } from "./client-sidebar";

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Claude Design (PiggyBank.dc.html) 通りの外枠: 76px固定サイドバー + スクロール可能な
// コンテンツ領域のみの単純なflex構成。go-design-systemのAppLayout(ヘッダーバー+
// 展開/省略トグル付きSidebarProvider)は使わない — デザインにヘッダーバーは無く、
// サイドバーも常時アイコンのみの固定幅という前提のため。
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }
  return (
    // h-screen + overflow-hidden をここで固定し、スクロールはコンテンツ領域だけに
    // 閉じ込める(サイドバーの高さがコンテンツの高さに引っ張られてログアウトボタンが
    // 画面外に出てしまわないように)。
    <div className="flex w-full h-screen overflow-hidden" style={{ backgroundColor: "#FAF5EE" }}>
      <PiggyBankSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-1 overflow-y-auto px-8 py-6 pb-12">{children}</div>
      </div>
    </div>
  );
}
