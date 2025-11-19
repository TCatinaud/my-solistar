import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { ClerkProvider, UserButton } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MySolisArt - Chauffage Solaire",
  description: "Application de suivi des données de chauffage solaire SolisArt",
};

const Header = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold hover:opacity-80 transition-opacity"
        >
          MySolisArt
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/evolution">
            <Button variant="outline">Évolution</Button>
          </Link>
          <Link href="/import">
            <Button variant="outline">Import</Button>
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </nav>
      </div>
    </header>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className={inter.className}>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
