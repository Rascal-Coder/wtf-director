import "../globals.css";

import { Geist } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppNavbar } from "@/components/app-navbar";
import { Providers } from "@/app/providers";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={cn(
        "dark font-sans antialiased",
        geistSans.variable,
        GeistMono.variable,
      )}
    >
      <body className="min-h-screen bg-background text-foreground">
        <NextIntlClientProvider>
          <Providers>
            <div className="flex min-h-screen">
              <AppNavbar />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
