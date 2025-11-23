"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Field } from "@/components/molecules/field";

export const dynamic = "force-dynamic";

const SignInForm = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const redirectUrl = searchParams.get("redirect_url");
      router.push(redirectUrl || "/");
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!isLoaded) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          const redirectUrl = searchParams.get("redirect_url");
          router.push(redirectUrl || "/");
        } else {
          setError("Une erreur est survenue lors de la connexion");
        }
      } catch (err: any) {
        // Extraire le message d'erreur de Clerk
        let errorMessage = "Erreur lors de la connexion";

        if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
          // Clerk retourne un tableau d'erreurs
          errorMessage = err.errors[0].message || errorMessage;
        } else if (err?.message) {
          // Erreur avec un message direct
          errorMessage = err.message;
        } else if (typeof err === "string") {
          // Erreur sous forme de string
          errorMessage = err;
        }

        // Messages d'erreur plus conviviaux en français
        if (
          errorMessage.includes("form_identifier_not_found") ||
          errorMessage.includes("not found")
        ) {
          errorMessage = "Aucun compte trouvé avec cet email";
        } else if (
          errorMessage.includes("form_password_incorrect") ||
          errorMessage.includes("incorrect")
        ) {
          errorMessage = "Mot de passe incorrect";
        } else if (errorMessage.includes("form_param_format_invalid")) {
          errorMessage = "Format d'email invalide";
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded, signIn, email, password, setActive, searchParams, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    },
    [handleSubmit]
  );

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    router.push("/");
    return;
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
      <div className="p-5">
        <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
      </div>
      <div className="flex flex-col flex-1 max-w-md w-full m-auto justify-center">
        <h1 className="h3-like mb-xs">Connexion</h1>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-4"
        >
          <Field
            label="Email"
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="email"
            aria-label="Adresse email"
            aria-required="true"
          />

          <Field
            label="Mot de passe"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="current-password"
            aria-label="Mot de passe"
            aria-required="true"
          />

          {error && (
            <div
              className="p-3 text-sm text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            aria-label="Se connecter"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </Button>

          <div className="text-center mt-4">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Réinitialiser le mot de passe"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

const SignInPage = () => {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
          <div className="p-5">
            <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
          </div>
          <div className="flex flex-col flex-1 max-w-md w-full m-auto justify-center">
            <h1 className="h3-like mb-xs">Connexion</h1>
            <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
};

export default SignInPage;
