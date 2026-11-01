import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/AuthProvider";

import "./globals.css";

// Same two families as the Mendyr apps — Inter for body text, Outfit for headings.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mendyr Admin", template: "%s · Mendyr Admin" },
  description: "Mendyr super-admin console: verification, operations and app configuration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-page font-sans text-[14px] text-slate-900 antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
