"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface ImportResponse {
  success: boolean;
  message: string;
  fileExists?: boolean;
  fileName?: string;
  month?: string;
}

interface FileMetadata {
  fileName: string;
  month: string;
  monthLabel: string;
  isComplete: boolean;
  importedAt: string;
}

interface WeatherFileMetadata {
  fileName: string;
  month: string;
  monthLabel: string;
  importedAt: string;
  latitude?: number;
  longitude?: number;
}

const monthNames = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export default function ImportPage() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la météo
  const [weatherYear, setWeatherYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [weatherMonth, setWeatherMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [weatherFiles, setWeatherFiles] = useState<WeatherFileMetadata[]>([]);
  const [loadingWeatherFiles, setLoadingWeatherFiles] = useState(true);
  const [importingWeather, setImportingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherSuccess, setWeatherSuccess] = useState<string | null>(null);
  const [showDeleteWeatherDialog, setShowDeleteWeatherDialog] = useState(false);
  const [weatherFileToDelete, setWeatherFileToDelete] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadFiles();
    loadWeatherFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      const response = await fetch("/api/import/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Le fichier doit être un fichier CSV");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setPendingFile(file);
    uploadFile(file, false);
  };

  const uploadFile = async (file: File, confirmReplace: boolean) => {
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);
    if (confirmReplace) {
      formData.append("confirmReplace", "true");
    }

    try {
      setStatus("processing");
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data: ImportResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'import");
      }

      if (data.fileExists && !confirmReplace) {
        setExistingFileName(data.fileName || null);
        setShowConfirmDialog(true);
        setStatus("idle");
        return;
      }

      setStatus("success");
      setSuccessMessage(data.message || "Import réussi");
      setPendingFile(null);
      setExistingFileName(null);
      // Recharger la liste des fichiers
      loadFiles();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setPendingFile(null);
    }
  };

  const handleConfirmReplace = () => {
    if (pendingFile) {
      setShowConfirmDialog(false);
      uploadFile(pendingFile, true);
    }
  };

  const handleCancelReplace = () => {
    setShowConfirmDialog(false);
    setPendingFile(null);
    setExistingFileName(null);
    setStatus("idle");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDeleteClick = (fileName: string) => {
    setFileToDelete(fileName);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const response = await fetch(
        `/api/import/files?fileName=${encodeURIComponent(fileToDelete)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la suppression");
      }

      setShowDeleteDialog(false);
      setFileToDelete(null);
      loadFiles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
      setShowDeleteDialog(false);
      setFileToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setFileToDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Fonctions pour la météo
  const loadWeatherFiles = async () => {
    try {
      setLoadingWeatherFiles(true);
      const response = await fetch("/api/weather/files");
      if (response.ok) {
        const data = await response.json();
        setWeatherFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error loading weather files:", err);
    } finally {
      setLoadingWeatherFiles(false);
    }
  };

  const handleImportWeather = async () => {
    if (!weatherYear || !weatherMonth) {
      setWeatherError("Veuillez sélectionner une année et un mois");
      return;
    }

    setImportingWeather(true);
    setWeatherError(null);
    setWeatherSuccess(null);

    try {
      const response = await fetch("/api/weather/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: parseInt(weatherYear),
          month: parseInt(weatherMonth),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'import");
      }

      setWeatherSuccess(data.message || "Import réussi");
      loadWeatherFiles();
    } catch (err) {
      setWeatherError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setImportingWeather(false);
    }
  };

  const handleDeleteWeatherClick = (fileName: string) => {
    setWeatherFileToDelete(fileName);
    setShowDeleteWeatherDialog(true);
  };

  const handleConfirmDeleteWeather = async () => {
    if (!weatherFileToDelete) return;

    try {
      const response = await fetch(
        `/api/weather/files?fileName=${encodeURIComponent(
          weatherFileToDelete
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la suppression");
      }

      setShowDeleteWeatherDialog(false);
      setWeatherFileToDelete(null);
      loadWeatherFiles();
    } catch (err) {
      setWeatherError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
      setShowDeleteWeatherDialog(false);
      setWeatherFileToDelete(null);
    }
  };

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Import de données</h1>
        <p className="text-muted-foreground">
          Importez un fichier CSV contenant l&apos;historique des données de
          chauffage solaire
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de fichier CSV</CardTitle>
          <CardDescription>
            Sélectionnez ou glissez-déposez un fichier CSV à importer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-input"
            />
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Glissez-déposez votre fichier CSV ici ou
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === "uploading" || status === "processing"}
              >
                Sélectionner un fichier
              </Button>
            </div>
          </div>

          {status === "uploading" && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Upload en cours...
              </p>
            </div>
          )}

          {status === "processing" && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Traitement du fichier en cours...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fichiers importés</CardTitle>
          <CardDescription>
            Liste des fichiers CSV importés et convertis en JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFiles ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Chargement des fichiers...
              </p>
            </div>
          ) : files.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun fichier importé pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.fileName}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{file.monthLabel}</h3>
                      {file.isComplete ? (
                        <Badge variant="default">Mois complet</Badge>
                      ) : (
                        <Badge variant="outline">Mois incomplet</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Importé le {formatDate(file.importedAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(file.fileName)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fichier existant</DialogTitle>
            <DialogDescription>
              Le fichier {existingFileName} existe déjà. Voulez-vous le
              remplacer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelReplace}>
              Annuler
            </Button>
            <Button onClick={handleConfirmReplace}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le fichier</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le fichier {fileToDelete} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Import de données météo</CardTitle>
          <CardDescription>
            Récupérer les données météo historiques pour un mois donné
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Année</label>
              <Select
                value={weatherYear}
                onValueChange={setWeatherYear}
                disabled={importingWeather}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Mois</label>
              <Select
                value={weatherMonth}
                onValueChange={setWeatherMonth}
                disabled={importingWeather}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem
                      key={index + 1}
                      value={String(index + 1).padStart(2, "0")}
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleImportWeather}
              disabled={importingWeather || !weatherYear || !weatherMonth}
            >
              {importingWeather ? "Import en cours..." : "Importer"}
            </Button>
          </div>

          {importingWeather && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Récupération des données météo...
              </p>
            </div>
          )}

          {weatherError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{weatherError}</p>
            </div>
          )}

          {weatherSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{weatherSuccess}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fichiers météo importés</CardTitle>
          <CardDescription>
            Liste des mois pour lesquels les données météo ont été importées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingWeatherFiles ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Chargement des fichiers...
              </p>
            </div>
          ) : weatherFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun fichier météo importé pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {weatherFiles.map((file) => (
                <div
                  key={file.fileName}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{file.monthLabel}</h3>
                    <p className="text-sm text-muted-foreground">
                      Importé le {formatDate(file.importedAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteWeatherClick(file.fileName)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showDeleteWeatherDialog}
        onOpenChange={setShowDeleteWeatherDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le fichier météo</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le fichier{" "}
              {weatherFileToDelete} ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteWeatherDialog(false);
                setWeatherFileToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteWeather}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
