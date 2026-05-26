import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "上海买房助手",
  description: "在地图上看楼盘，记录看楼经历",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b bg-white">
          <nav className="flex items-center gap-6 px-4 py-3">
            <Link href="/map" className="font-semibold text-lg">
              上海买房助手
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/map" className="hover:text-blue-600">
                地图
              </Link>
              <Link href="/visits" className="hover:text-blue-600">
                看楼记录
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
