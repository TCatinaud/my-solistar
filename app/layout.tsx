import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Home Energy - Chauffage Solaire",
  description: "Application de suivi des données de chauffage solaire SolisArt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-6 py-4">
            <a
              href="/"
              className="text-xl font-semibold hover:opacity-80 transition-opacity"
            >
              Solar Home
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
