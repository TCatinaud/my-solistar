import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readFile, writeFile } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Coordonnées par défaut depuis les variables d'environnement
const DEFAULT_LATITUDE = parseFloat(
  process.env.WEATHER_LATITUDE || "44.3791389465332"
);
const DEFAULT_LONGITUDE = parseFloat(
  process.env.WEATHER_LONGITUDE || "2.5693840980529785"
);

interface DataNowFile {
  date: string;
  data?: any;
  weather?: {
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
  };
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_min: number[];
  temperature_2m_max: number[];
  weather_code: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
}

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: OpenMeteoHourly;
  daily: OpenMeteoDaily;
}

const isDataRecent = (date: string | undefined): boolean => {
  if (!date) return false;
  const dataDate = new Date(date).getTime();
  const now = Date.now();
  const age = now - dataDate;
  return age < CACHE_DURATION_MS;
};

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get("force") === "true";

    // Lire le fichier data-now.json pour vérifier le cache
    if (!forceRefresh) {
      const cachedContent = await readFile("data-now.json");
      if (cachedContent) {
        try {
          const cachedData: DataNowFile = JSON.parse(cachedContent);
          if (
            cachedData.weather?.date &&
            isDataRecent(cachedData.weather.date) &&
            cachedData.weather.current
          ) {
            // Retourner les données météo en cache
            return NextResponse.json(cachedData.weather, {
              status: 200,
              headers: {
                "Cache-Control": "public, max-age=600",
              },
            });
          }
        } catch (error) {
          console.error("Error parsing cached weather data:", error);
        }
      }
    }

    // Si pas de cache valide ou force refresh, récupérer de nouvelles données
    const lat = DEFAULT_LATITUDE;
    const lon = DEFAULT_LONGITUDE;

    // Appel à l'API Open-Meteo Forecast
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_min,temperature_2m_max,weather_code,wind_speed_10m_max,wind_direction_10m_dominant&timezone=Europe/Paris&forecast_days=4`;

    console.log(`Fetching weather data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      let errorMessage = `Erreur API météo: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.reason) {
          errorMessage = `Erreur API météo: ${errorData.reason}`;
        } else if (errorData.error) {
          errorMessage = `Erreur API météo: ${errorData.error}`;
        }
      } catch (e) {
        const text = await response.text();
        console.error("API Error Response (text):", text);
      }
      throw new Error(errorMessage);
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.current || !data.daily) {
      throw new Error("Aucune donnée météo disponible");
    }

    // Filtrer les données horaires pour aujourd'hui (8h à 20h, toutes les 2 heures)
    const hourlyToday: { time: string; temperature: number; weatherCode: number }[] = [];
    if (data.hourly && data.hourly.time) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const targetHours = [8, 10, 12, 14, 16, 18, 20];
      
      for (let i = 0; i < data.hourly.time.length; i++) {
        const hourTime = new Date(data.hourly.time[i]);
        const hourDate = hourTime.toISOString().split("T")[0];
        const hour = hourTime.getHours();
        
        // Prendre les heures cibles (8h, 10h, 12h, 14h, 16h, 18h, 20h) pour aujourd'hui
        if (hourDate === today && targetHours.includes(hour)) {
          hourlyToday.push({
            time: data.hourly.time[i],
            temperature: data.hourly.temperature_2m[i],
            weatherCode: data.hourly.weather_code[i],
          });
        }
      }
      
      // Trier par heure pour s'assurer de l'ordre
      hourlyToday.sort((a, b) => {
        const hourA = new Date(a.time).getHours();
        const hourB = new Date(b.time).getHours();
        return hourA - hourB;
      });
    }

    // Transformer les données au format attendu
    const weatherData = {
      date: new Date().toISOString(),
      current: {
        temperature: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
      },
      today: {
        tempMin: data.daily.temperature_2m_min[0],
        tempMax: data.daily.temperature_2m_max[0],
      },
      hourly: hourlyToday,
      daily: data.daily.time
        .slice(1, 4) // Prendre les 3 jours suivants (exclure aujourd'hui)
        .map((date, index) => ({
          date,
          tempMin: data.daily.temperature_2m_min[index + 1],
          tempMax: data.daily.temperature_2m_max[index + 1],
          weatherCode: data.daily.weather_code[index + 1],
          windSpeed: data.daily.wind_speed_10m_max[index + 1],
          windDirection: data.daily.wind_direction_10m_dominant[index + 1],
        })),
    };

    // Lire le fichier existant pour préserver les données de chauffage
    let existingData: Partial<DataNowFile> = {};
    const existingContent = await readFile("data-now.json");
    if (existingContent) {
      try {
        existingData = JSON.parse(existingContent);
      } catch (error) {
        console.error("Error parsing existing data:", error);
      }
    }

    // Sauvegarder les nouvelles données météo en préservant les données de chauffage
    const dataToSave: DataNowFile = {
      date: existingData.date || new Date().toISOString(),
      data: existingData.data, // Préserver les données de chauffage
      weather: weatherData,
    };

    await writeFile("data-now.json", JSON.stringify(dataToSave, null, 2));

    return NextResponse.json(weatherData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in weather API route:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données météo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

