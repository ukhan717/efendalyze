import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Efendalyze — AI Website Audit Platform",
  description:
    "Professional AI-powered website audits. Analyse SEO, accessibility, UX, performance and get actionable recommendations instantly.",
  keywords: ["website audit", "SEO analysis", "UX review", "accessibility checker"],
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
