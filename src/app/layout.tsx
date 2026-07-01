import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Finanças — Sérgio Mattina",
  description: "Controle financeiro pessoal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={outfit.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
