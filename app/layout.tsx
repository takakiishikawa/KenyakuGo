import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mono-display",
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
    <html
      lang="ja"
      className={`${dmSerifDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" style={{ backgroundColor: "#0A0F0D" }}>
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <main className="ml-60 flex-1 overflow-y-auto p-10" style={{ backgroundColor: "#0A0F0D" }}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
