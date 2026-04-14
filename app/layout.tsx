import type { Metadata } from "next";
import { Noto_Sans_JP, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

const notoSansJP = Noto_Sans_JP({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KenyakuGo",
  description: "ベース支出を抑えて、使う時に使う。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${dmSerifDisplay.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* テーマをページロード前に適用してフラッシュを防止 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('kg-theme');var d=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add(d);})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <Providers>
            <div className="flex h-screen" style={{ backgroundColor: "var(--kg-bg)" }}>
              <Sidebar />
              <main className="ml-[260px] flex-1 overflow-y-auto p-10" style={{ backgroundColor: "var(--kg-bg)" }}>
                {children}
              </main>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
