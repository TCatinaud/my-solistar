"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardData } from "@/components/card-data";
import { useFormatDate } from "@/hooks/use-format-date";
import {
  WeatherSunny24Regular,
  Drop24Regular,
  Fire24Regular,
  Temperature24Regular,
  WeatherCloudy24Regular,
} from "@fluentui/react-icons";

interface HeatingData {
  date: string;
  fetchedAt?: string;
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
    boiler: {
      active: boolean;
      temperature: number;
    };
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

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = "heating-data-cache";

const getCachedData = (): HeatingData | null => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    const data: HeatingData = JSON.parse(cached);
    return data;
  } catch {
    return null;
  }
};

const setCachedData = (data: HeatingData): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

const isDataRecent = (data: HeatingData | null): boolean => {
  if (!data || !data.date) {
    return false;
  }

  const dataDate = new Date(data.date).getTime();
  const now = Date.now();
  const age = now - dataDate;

  return age < CACHE_DURATION_MS;
};

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HeatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatDate = useFormatDate();

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await fetch("/api/heating");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la récupération des données"
        );
      }

      const result = await response.json();
      const dataWithTimestamp: HeatingData = {
        ...result,
        fetchedAt: new Date().toISOString(),
      };
      setData(dataWithTimestamp);
      setCachedData(dataWithTimestamp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      console.error("Error fetching heating data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const cachedData = getCachedData();

    if (cachedData && isDataRecent(cachedData)) {
      // Utiliser les données en cache si elles sont récentes
      setData(cachedData);
      setLoading(false);
    } else {
      // Fetcher de nouvelles données
      fetchData(false);
    }
  }, [isLoaded, isSignedIn, fetchData]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">MySolisArt</h1>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            aria-label="Actualiser les données"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Actualisation...
              </>
            ) : (
              "Actualiser"
            )}
          </Button>
        </div>
        {data && (
          <p className="text-muted-foreground">
            Données de chauffage solaire - Dernière mise à jour :{" "}
            {formatDate(data.date)}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Panneaux solaires */}
        <CardData
          title="Panneaux solaires"
          icon={<WeatherSunny24Regular />}
          description="Capteurs de température"
          items={
            data
              ? [
                  {
                    label: "Capteur chaud",
                    value: `${data.data.panels.hotSensor} °C`,
                  },
                  {
                    label: "Capteur froid",
                    value: `${data.data.panels.coldSensor} °C`,
                  },
                ]
              : []
          }
          loading={loading}
          error={!!error}
        />

        {/* Ballon */}
        <CardData
          title="Ballon"
          icon={<Drop24Regular />}
          description="Eau chaude sanitaire"
          items={
            data
              ? [
                  {
                    label: "Solaire",
                    value: `${data.data.tank.solar} °C`,
                  },
                  {
                    label: "Appoint",
                    value: `${data.data.tank.additional} °C`,
                  },
                  {
                    label: "Origine",
                    tag: data.data.tank.origin,
                  },
                  {
                    label: "Min",
                    value: `${data.data.tank.min} °C`,
                    size: "small",
                  },
                  {
                    label: "Confort",
                    value: `${data.data.tank.confort} °C`,
                    size: "small",
                  },
                ]
              : []
          }
          loading={loading}
          error={!!error}
        />

        {/* Chaudière */}
        <CardData
          title="Chaudière"
          icon={<Fire24Regular />}
          description="Température de la chaudière"
          items={
            data
              ? [
                  {
                    label: "Statut",
                    tag: data.data.boiler.active ? "solar" : "off",
                  },
                  {
                    label: "Température",
                    value: `${data.data.boiler.temperature} °C`,
                  },
                ]
              : []
          }
          loading={loading}
          error={!!error}
        />

        {/* Radiateur */}
        <CardData
          title="Radiateur"
          icon={<Temperature24Regular />}
          description="Circuit de chauffage"
          items={
            data
              ? [
                  {
                    label: "Entrée",
                    value: `${data.data.radiator.inlet} °C`,
                  },
                  {
                    label: "Sortie",
                    value: `${data.data.radiator.outlet} °C`,
                  },
                  {
                    label: "Origine",
                    tag: data.data.radiator.origin,
                  },
                  {
                    label: "Min",
                    value: `${data.data.radiator.min} °C`,
                    size: "small",
                  },
                  {
                    label: "Confort",
                    value: `${data.data.radiator.confort} °C`,
                    size: "small",
                  },
                ]
              : []
          }
          loading={loading}
          error={!!error}
        />

        {/* Thermomètres */}
        <CardData
          title="Thermomètres"
          icon={<WeatherCloudy24Regular />}
          description="Températures ambiantes"
          items={
            data
              ? [
                  {
                    label: "Extérieur",
                    value: `${data.data.thermometer.outdoor} °C`,
                  },
                  {
                    label: "Intérieur",
                    value: `${data.data.thermometer.indoor} °C`,
                  },
                ]
              : []
          }
          loading={loading}
          error={!!error}
        />
      </div>
    </main>
  );
}
