import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/AppearanceSheet";
import { siteUrl } from "@/lib/supabase/config";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Oblee — find the party you love",
    template: "%s · Oblee",
  },
  description:
    "Oblee is an African event and party discovery platform. Discover events, save your favourites and find places to enjoy.",
  applicationName: "Oblee",
  openGraph: {
    title: "Oblee — find the party you love",
    description: "Discover parties, concerts, festivals and owambe across Africa.",
    siteName: "Oblee",
    type: "website",
  },
  icons: { icon: "/brand/mark.png", apple: "/brand/mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#6a47f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jakarta.variable}>
        <ThemeScript />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
