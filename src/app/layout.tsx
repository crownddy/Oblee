import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  organisationJsonLd,
  searchConsoleVerification,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
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
    default: DEFAULT_TITLE,
    template: "%s · Oblee",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: "Oblee",
  openGraph: {
    title: DEFAULT_TITLE,
    description: "Discover parties, concerts, festivals and owambe across Africa.",
    siteName: "Oblee",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/brand/mark.png", apple: "/brand/mark.png" },
  // Search Console HTML-tag verification; absent unless the operator sets the
  // environment variable, so no token is ever committed.
  verification: searchConsoleVerification(),
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
        <JsonLd data={serializeJsonLd(websiteJsonLd(siteUrl))} />
        <JsonLd data={serializeJsonLd(organisationJsonLd(siteUrl))} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
