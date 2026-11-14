import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingsLoader } from "@/components/SettingsLoader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://safeshare-ee7d7.web.app";
const DESCRIPTION =
  "Use powerful cloud AI on private documents. Personal data is found and hidden on your device, so the cloud only ever sees placeholders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SafeShare: cloud AI without sharing private data", template: "%s · SafeShare" },
  description: DESCRIPTION,
  applicationName: "SafeShare",
  openGraph: {
    type: "website",
    siteName: "SafeShare",
    title: "SafeShare: cloud AI without sharing private data",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeShare: cloud AI without sharing private data",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-surface px-4 py-2 font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SettingsLoader />
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 outline-none sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
