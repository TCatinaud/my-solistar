"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/molecules/field";

const ComptePage = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (isUserLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isUserLoaded, isSignedIn, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.emailAddresses[0]?.emailAddress || "");
    }
  }, [user]);

  const handleUpdateProfile = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user || !isUserLoaded) return;

      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        await user.update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

        // Mise à jour de l'email si différent
        const primaryEmail = user.emailAddresses[0]?.emailAddress;
        if (email.trim() !== primaryEmail) {
          // Clerk nécessite de créer une nouvelle adresse email et de la vérifier
          // Pour simplifier, on informe l'utilisateur qu'il doit utiliser le dashboard Clerk
          setSuccess(
            "Profil mis à jour. Pour changer l'email, veuillez utiliser les paramètres de votre compte."
          );
        } else {
          setSuccess("Profil mis à jour avec succès");
        }
      } catch (err: any) {
        setError(
          err.errors?.[0]?.message || "Erreur lors de la mise à jour du profil"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user, isUserLoaded, firstName, lastName, email]
  );

  const handleUpdatePassword = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user || !isUserLoaded) return;

      if (newPassword !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }

      if (newPassword.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }

      setIsPasswordLoading(true);
      setError(null);
      setSuccess(null);

      try {
        await user.updatePassword({
          currentPassword,
          newPassword,
        });

        setSuccess("Mot de passe mis à jour avec succès");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        setError(
          err.errors?.[0]?.message ||
            "Erreur lors de la mise à jour du mot de passe"
        );
      } finally {
        setIsPasswordLoading(false);
      }
    },
    [user, isUserLoaded, currentPassword, newPassword, confirmPassword]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = e.currentTarget;
        if (form.id === "profile-form") {
          handleUpdateProfile(e as any);
        } else if (form.id === "password-form") {
          handleUpdatePassword(e as any);
        }
      }
    },
    [handleUpdateProfile, handleUpdatePassword]
  );

  if (!isUserLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 px-4">
      <div className="flex flex-col flex-1 max-w-2xl w-full m-auto justify-center py-8">
        <h1 className="h3-like mb-8">Mon Compte</h1>

        {/* Section Profil */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Informations personnelles
          </h2>

          <form
            id="profile-form"
            onSubmit={handleUpdateProfile}
            onKeyDown={handleKeyDown}
            className="space-y-4"
          >
            {error && !error.includes("mot de passe") && (
              <div
                className="p-3 text-sm text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {success && !success.includes("mot de passe") && (
              <div
                className="p-3 text-sm text-green-800 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Prénom"
                id="firstName"
                type="text"
                placeholder="Votre prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="given-name"
                aria-label="Prénom"
                aria-required="true"
              />

              <Field
                label="Nom"
                id="lastName"
                type="text"
                placeholder="Votre nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="family-name"
                aria-label="Nom"
                aria-required="true"
              />
            </div>

            <Field
              label="Adresse email"
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
              disabled={isLoading || !isUserLoaded}
              aria-label="Mettre à jour le profil"
            >
              {isLoading ? "Mise à jour..." : "Mettre à jour le profil"}
            </Button>
          </form>
        </div>

        {/* Section Mot de passe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Changer le mot de passe
          </h2>

          <form
            id="password-form"
            onSubmit={handleUpdatePassword}
            onKeyDown={handleKeyDown}
            className="space-y-4"
          >
            {error && error.includes("mot de passe") && (
              <div
                className="p-3 text-sm text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {success && success.includes("mot de passe") && (
              <div
                className="p-3 text-sm text-green-800 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {success}
              </div>
            )}

            <Field
              label="Mot de passe actuel"
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isPasswordLoading}
              autoComplete="current-password"
              aria-label="Mot de passe actuel"
              aria-required="true"
            />

            <Field
              label="Nouveau mot de passe"
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isPasswordLoading}
              autoComplete="new-password"
              aria-label="Nouveau mot de passe"
              aria-required="true"
            />

            <Field
              label="Confirmer le nouveau mot de passe"
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isPasswordLoading}
              autoComplete="new-password"
              aria-label="Confirmer le nouveau mot de passe"
              aria-required="true"
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPasswordLoading || !isUserLoaded}
              aria-label="Changer le mot de passe"
            >
              {isPasswordLoading ? "Mise à jour..." : "Changer le mot de passe"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ComptePage;
