"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardData } from "@/components/card-data";
import { WeatherCard } from "@/components/weather-card";
import { useFormatDate } from "@/hooks/use-format-date";
import {
  WeatherSunny24Regular,
  Drop24Regular,
  Fire24Regular,
  Temperature24Regular,
  WeatherCloudy24Regular,
  WeatherRain24Regular,
  WeatherMoon24Regular,
} from "@fluentui/react-icons";

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

interface WeatherData {
  date: string;
  current: {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
  };
  today?: {
    tempMin: number;
    tempMax: number;
  };
  hourly?: {
    time: string;
    temperature: number;
    weatherCode: number;
  }[];
  daily: {
    date: string;
    tempMin: number;
    tempMax: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
  }[];
}

const getWeatherIcon = (weatherCode: number, isNight: boolean = false) => {
  // Codes WMO
  // 0-1 : Ciel clair / Principalement clair
  // 2-3 : Partiellement nuageux
  // 45-48 : Brouillard
  // 51-67 : Pluie (légère à forte)
  // 71-77 : Neige
  // 80-82 : Averses de pluie
  // 85-86 : Averses de neige
  // 95-99 : Orage

  if (isNight && (weatherCode === 0 || weatherCode === 1)) {
    return <WeatherMoon24Regular className="text-slate-300" />;
  }

  if (weatherCode === 0 || weatherCode === 1) {
    return <WeatherSunny24Regular className="text-yellow-400" />;
  }

  if (weatherCode >= 2 && weatherCode <= 3) {
    return <WeatherCloudy24Regular className="text-slate-300" />;
  }

  if (weatherCode >= 45 && weatherCode <= 48) {
    return <WeatherCloudy24Regular className="text-slate-400" />;
  }

  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return <WeatherRain24Regular className="text-slate-600" />;
  }

  if (weatherCode >= 71 && weatherCode <= 77) {
    return <WeatherCloudy24Regular className="text-slate-200" />;
  }

  if (weatherCode >= 85 && weatherCode <= 86) {
    return <WeatherCloudy24Regular className="text-slate-300" />;
  }

  if (weatherCode >= 95 && weatherCode <= 99) {
    return <WeatherRain24Regular className="text-slate-700" />;
  }

  return <WeatherCloudy24Regular className="text-slate-300" />;
};

const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 20;
};

const formatForecastDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HeatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const formatDate = useFormatDate();

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const url = forceRefresh ? "/api/heating?force=true" : "/api/heating";
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors de la récupération des données"
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      console.error("Error fetching heating data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchWeatherData = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        if (forceRefresh) {
          setWeatherRefreshing(true);
        } else {
          setWeatherLoading(true);
        }
        setWeatherError(null);
        const url = forceRefresh ? "/api/weather?force=true" : "/api/weather";
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              "Erreur lors de la récupération des données météo"
          );
        }

        const result = await response.json();
        setWeatherData(result);
      } catch (err) {
        setWeatherError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
        console.error("Error fetching weather data:", err);
      } finally {
        setWeatherLoading(false);
        setWeatherRefreshing(false);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    fetchData(true);
    fetchWeatherData(true);
  }, [fetchData, fetchWeatherData]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    fetchData(false);
    fetchWeatherData(false);
  }, [isLoaded, isSignedIn, fetchData, fetchWeatherData]);

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
            disabled={
              refreshing || loading || weatherRefreshing || weatherLoading
            }
            variant="outline"
            aria-label="Actualiser les données"
          >
            {refreshing || weatherRefreshing ? (
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

        {/* Météo */}
        <div className="col-span-full">
          <WeatherCard
            current={weatherData?.current}
            today={weatherData?.today}
            hourly={weatherData?.hourly}
            daily={weatherData?.daily}
            loading={weatherLoading}
            error={!!weatherError}
            getWeatherIcon={getWeatherIcon}
            getWindDirection={getWindDirection}
            isNightTime={isNightTime}
            formatForecastDate={formatForecastDate}
          />
        </div>
      </div>
    </main>
  );
}
