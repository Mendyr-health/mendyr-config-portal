import type { Metadata } from "next";

import { AuthProvider } from "@/lib/AuthProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mendyr Config Portal",
  description: "Admin portal for managing Mendyr backend config entries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
