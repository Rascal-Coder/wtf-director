import "./globals.css";

import { Geist } from "next/font/google";
import { GeistMono } from "geist/font/mono";

import { AppNavbar } from "@/components/app-navbar";
import { cn } from "@/lib/utils";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={cn(
        "dark font-sans antialiased",
        geistSans.variable,
        GeistMono.variable,
      )}
    >
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          <AppNavbar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
