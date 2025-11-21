"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";

const ConditionalHeader = () => {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/sign-in");

  if (isAuthPage) {
    return null;
  }

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

export { ConditionalHeader };

