"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HeatingData {
  date: string;
  data: {
    panels: {
      hotSensor: number;
      coldSensor: number;
    };
    tank: {
      solar: number;
      additional: number;
      origin: string;
      min: number;
      confort: number;
    };
    boiler: number;
    radiator: {
      inlet: number;
      outlet: number;
      origin: string;
      min: number;
      confort: number;
    };
    thermometer: {
      outdoor: number;
      indoor: number;
    };
  };
}

const getOriginLabel = (origin: string): string => {
  const labels: Record<string, string> = {
    off: "Arrêt",
    solar: "Solaire",
    gas: "Solaire + appoint",
  };
  return labels[origin] || origin;
};

const getOriginVariant = (
  origin: string
): "default" | "secondary" | "destructive" | "outline" => {
  if (origin === "solar") return "default";
  if (origin === "gas") return "secondary";
  if (origin === "off") return "outline";
  return "outline";
};

export default function Home() {
  const [data, setData] = useState<HeatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/heating");

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Erreur lors de la récupération des données"
          );
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
        console.error("Error fetching heating data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Erreur</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "medium",
    });
  };

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Home Energy</h1>
        <p className="text-muted-foreground">
          Données de chauffage solaire - Dernière mise à jour :{" "}
          {formatDate(data.date)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Panneaux solaires */}
        <Card>
          <CardHeader>
            <CardTitle>Panneaux solaires</CardTitle>
            <CardDescription>Capteurs de température</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Capteur chaud
              </span>
              <span className="text-lg font-semibold">
                {data.data.panels.hotSensor} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Capteur froid
              </span>
              <span className="text-lg font-semibold">
                {data.data.panels.coldSensor} °C
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ballon */}
        <Card>
          <CardHeader>
            <CardTitle>Ballon</CardTitle>
            <CardDescription>Eau chaude sanitaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Solaire</span>
              <span className="text-lg font-semibold">
                {data.data.tank.solar} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Appoint</span>
              <span className="text-lg font-semibold">
                {data.data.tank.additional} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Origine</span>
              <Badge variant={getOriginVariant(data.data.tank.origin)}>
                {getOriginLabel(data.data.tank.origin)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Min</span>
              <span className="text-sm">{data.data.tank.min} °C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confort</span>
              <span className="text-sm">{data.data.tank.confort} °C</span>
            </div>
          </CardContent>
        </Card>

        {/* Chaudière */}
        <Card>
          <CardHeader>
            <CardTitle>Chaudière</CardTitle>
            <CardDescription>Température de la chaudière</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Température</span>
              <span className="text-2xl font-bold">{data.data.boiler} °C</span>
            </div>
          </CardContent>
        </Card>

        {/* Radiateur */}
        <Card>
          <CardHeader>
            <CardTitle>Radiateur</CardTitle>
            <CardDescription>Circuit de chauffage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Entrée</span>
              <span className="text-lg font-semibold">
                {data.data.radiator.inlet} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sortie</span>
              <span className="text-lg font-semibold">
                {data.data.radiator.outlet} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Origine</span>
              <Badge variant={getOriginVariant(data.data.radiator.origin)}>
                {getOriginLabel(data.data.radiator.origin)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Min</span>
              <span className="text-sm">{data.data.radiator.min} °C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confort</span>
              <span className="text-sm">{data.data.radiator.confort} °C</span>
            </div>
          </CardContent>
        </Card>

        {/* Thermomètres */}
        <Card>
          <CardHeader>
            <CardTitle>Thermomètres</CardTitle>
            <CardDescription>Températures ambiantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Extérieur</span>
              <span className="text-lg font-semibold">
                {data.data.thermometer.outdoor} °C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Intérieur</span>
              <span className="text-lg font-semibold">
                {data.data.thermometer.indoor} °C
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
