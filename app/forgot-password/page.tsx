"use client";

import { useState, useEffect, useCallback } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Field } from "@/components/molecules/field";

const ForgotPasswordPage = () => {
  const { isLoaded, signIn } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!isLoaded) return;

      setIsLoading(true);
      setError(null);

      try {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email,
        });

        setIsEmailSent(true);
      } catch (err: any) {
        setError(
          err.errors?.[0]?.message || "Erreur lors de l'envoi de l'email"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded, signIn, email]
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

  if (isEmailSent) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
        <div className="p-5">
          <Image src="/logo.svg" alt="MySolisArt" width={50} height={50} />
        </div>
        <div className="flex flex-col flex-1 max-w-md w-full m-auto justify-center">
          <h1 className="h3-like mb-xs">Email envoyé</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Un email de réinitialisation a été envoyé à <strong>{email}</strong>
            . Veuillez vérifier votre boîte de réception et suivre les
            instructions.
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => router.push("/reset-password")}
              className="w-full"
              aria-label="Continuer vers la réinitialisation"
            >
              Continuer
            </Button>
            <div className="text-center">
              <Link
                href="/sign-in"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label="Retour à la connexion"
              >
                Retour à la connexion
              </Link>
            </div>
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
        <h1 className="h3-like mb-xs">Réinitialisation du mot de passe</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Entrez votre adresse email et nous vous enverrons un code de
          réinitialisation.
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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isLoaded}
            aria-label="Envoyer le code de réinitialisation"
          >
            {isLoading ? "Envoi..." : "Envoyer le code"}
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

export default ForgotPasswordPage;
