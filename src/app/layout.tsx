import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";
import { getServerLocale } from "@/lib/i18n/server";
import { PwaProvider } from "@/components/pwa-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Inventory & Sales Management System",
  description: "Accurate, reliable stock and sales tracking for modern business with offline PWA support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InvPOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <LocaleProvider initialLocale={locale}>
          <PwaProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </PwaProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
