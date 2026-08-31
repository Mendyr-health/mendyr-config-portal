import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { AuthProvider } from "@/lib/AuthProvider";

import "./globals.css";

// Same two families as mendyr-frontend (apps/patient/src/app/layout.tsx) — Inter for body
// text, Outfit for headings — so this portal matches the product's visual identity.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Mendyr Config Portal",
  description: "Admin portal for managing Mendyr backend config entries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-[#F7F9FC] font-sans text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
