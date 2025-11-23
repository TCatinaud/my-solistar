"use client";

import { useState, useEffect, useCallback } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Field } from "@/components/molecules/field";

const ResetPasswordPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!isLoaded) return;

      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }

      if (password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code,
          password,
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          setIsSuccess(true);
          const redirectUrl = searchParams.get("redirect_url");
          setTimeout(() => {
            router.push(redirectUrl || "/");
          }, 2000);
        } else {
          setError("Une erreur est survenue lors de la réinitialisation");
        }
      } catch (err: any) {
        setError(
          err.errors?.[0]?.message ||
            "Erreur lors de la réinitialisation du mot de passe"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoaded,
      signIn,
      code,
      password,
      confirmPassword,
      setActive,
      searchParams,
      router,
    ]
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

  if (isSignedIn && !isSuccess) {
    router.push("/");
    return;
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
        <div className="p-5">
          <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
        </div>
        <div className="flex flex-col flex-1 max-w-md w-full m-auto justify-center">
          <h1 className="h3-like mb-xs">Mot de passe réinitialisé</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Votre mot de passe a été réinitialisé avec succès. Vous allez être
            redirigé vers la page d'accueil...
          </p>
          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Aller à la page d'accueil"
            >
              Aller à la page d'accueil
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
      <div className="p-5">
        <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
      </div>
      <div className="flex flex-col flex-1 max-w-md w-full m-auto justify-center">
        <h1 className="h3-like mb-xs">Réinitialiser le mot de passe</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Entrez le code reçu par email et votre nouveau mot de passe.
        </p>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-4"
        >
          {error && (
            <div
              className="p-3 text-sm text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <Field
            label="Code de vérification"
            id="code"
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="one-time-code"
            aria-label="Code de vérification"
            aria-required="true"
          />

          <Field
            label="Nouveau mot de passe"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="new-password"
            aria-label="Nouveau mot de passe"
            aria-required="true"
          />

          <Field
            label="Confirmer le mot de passe"
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="new-password"
            aria-label="Confirmer le mot de passe"
            aria-required="true"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            aria-label="Réinitialiser le mot de passe"
          >
            {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
          </Button>

          <div className="text-center mt-4">
            <Link
              href="/sign-in"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Retour à la connexion"
            >
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default ResetPasswordPage;

