import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { DesignTokens, AppLayout, Toaster } from "@takaki/go-design-system";
import { KenyakuGoSidebar } from "@/components/kenyaku-sidebar";

const notoSansJP = Noto_Sans_JP({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
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
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('kg-theme');var d=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add(d);})();`,
          }}
        />
        <DesignTokens primaryColor="#1A7A4A" primaryColorHover="#145C38" />
      </head>
      <body className="min-h-full">
        <AppLayout sidebar={<KenyakuGoSidebar />}>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
