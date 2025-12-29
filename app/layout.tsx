import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { ConditionalHeader } from "@/components/conditional-header";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

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
    <ClerkProvider signInUrl="/sign-in" signInFallbackRedirectUrl="/">
      <html lang="fr">
        <body className={`${nunito.variable} font-primary`}>
          <ConditionalHeader />
          <main className="container mx-auto">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
