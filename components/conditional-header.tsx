"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { Settings24Regular } from "@fluentui/react-icons";
import Image from "next/image";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const ConditionalHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const isAuthPage =
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password");

  if (isAuthPage) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold hover:opacity-80 transition-opacity"
        >
          <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/evolution">
            <Button variant="outline">Évolution</Button>
          </Link>
          <DropdownMenu
            trigger={
              <Button
                variant="outline"
                size="icon"
                aria-label="Menu paramètres"
                className="flex items-center justify-center"
              >
                <Settings24Regular className="h-5 w-5" />
              </Button>
            }
            align="right"
          >
            <DropdownMenuItem asChild>
              <Link href="/import" className="block">
                Imports
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account" className="block">
                Compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
};

export { ConditionalHeader };
