import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { ConditionalHeader } from "@/components/conditional-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MySolisArt - Chauffage Solaire",
  description: "Application de suivi des données de chauffage solaire SolisArt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/"
    >
      <html lang="fr">
        <body className={inter.className}>
          <ConditionalHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
