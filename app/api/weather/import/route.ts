import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

type DayData = {
  [timeSlot: string]: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    sunshineDuration: number;
    shortwaveRadiation?: number;
  };
};

type WeatherDataDays = {
  [day: string]: DayData | undefined;
};

type WeatherMetadata = {
  _metadata?: {
    importedAt: string;
    latitude: number;
    longitude: number;
  };
};

type WeatherData = WeatherDataDays & WeatherMetadata;

// Coordonnées par défaut depuis les variables d'environnement
const DEFAULT_LATITUDE = parseFloat(process.env.WEATHER_LATITUDE || "44.3791389465332");
const DEFAULT_LONGITUDE = parseFloat(process.env.WEATHER_LONGITUDE || "2.5693840980529785");

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const formatTimeSlot = (hour: number, minute: number): string => {
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    // Rate limiting pour les imports météo
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || userId;
    const rateLimit = checkRateLimit(ip, { maxRequests: 5, windowMs: 60000 }); // 5 imports par minute

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Trop de requêtes. Veuillez réessayer plus tard.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { year, month, latitude, longitude } = body;

    if (!year || !month) {
      return NextResponse.json(
        { success: false, message: "Année et mois requis" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Vérifier que l'année et le mois sont valides
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, message: "Année ou mois invalide" },
        { status: 400 }
      );
    }

    // L'API archive d'Open-Meteo supporte généralement les données depuis 1940
    // Vérifier que la date n'est pas dans le futur
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour la comparaison
    
    const requestedStartDate = new Date(yearNum, monthNum - 1, 1);
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const requestedEndDate = new Date(yearNum, monthNum - 1, daysInMonth);
    
    // Vérifier que le mois demandé n'est pas dans le futur
    if (requestedStartDate > currentDate) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Impossible de récupérer des données pour une date future. La date maximale disponible est ${currentDate.toLocaleDateString("fr-FR")}` 
        },
        { status: 400 }
      );
    }

    // Si la date de fin dépasse aujourd'hui, utiliser la date d'aujourd'hui
    const actualEndDate = requestedEndDate > currentDate ? currentDate : requestedEndDate;

    const lat = latitude || DEFAULT_LATITUDE;
    const lon = longitude || DEFAULT_LONGITUDE;

    // Calculer les dates de début et fin du mois
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${actualEndDate.getFullYear()}-${String(actualEndDate.getMonth() + 1).padStart(2, "0")}-${String(actualEndDate.getDate()).padStart(2, "0")}`;

    // Appel à l'API Open-Meteo pour les données historiques
    // Note: Certaines variables peuvent ne pas être disponibles selon la période
    // Commençons par les variables de base
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=Europe/Paris`;

    console.log(`Fetching weather data from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      // Récupérer le message d'erreur détaillé
      let errorMessage = `Erreur API météo: ${response.statusText}`;
      let errorDetails = "";
      try {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        if (errorData.reason) {
          errorMessage = `Erreur API météo: ${errorData.reason}`;
          errorDetails = errorData.reason;
        } else if (errorData.error) {
          errorMessage = `Erreur API météo: ${errorData.error}`;
          errorDetails = errorData.error;
        } else {
          errorDetails = JSON.stringify(errorData);
        }
      } catch (e) {
        // Si la réponse n'est pas du JSON, utiliser le statusText
        const text = await response.text();
        console.error("API Error Response (text):", text);
        errorDetails = text;
      }
      throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}`);
    }

    const data = await response.json();

    if (!data.hourly) {
      throw new Error("Aucune donnée météo disponible");
    }

    // Transformer les données au format attendu
    const weatherData: WeatherData = {};
    const {
      time,
      temperature_2m,
      wind_speed_10m,
      wind_direction_10m,
      sunshine_duration,
    } = data.hourly || {};

    if (!time || !Array.isArray(time) || time.length === 0) {
      throw new Error("Aucune donnée temporelle disponible dans la réponse");
    }

    console.log(`Processing ${time.length} data points`);

    for (let i = 0; i < time.length; i++) {
      const date = new Date(time[i]);
      if (isNaN(date.getTime())) {
        console.warn(`Date invalide à l'index ${i}: ${time[i]}`);
        continue;
      }

      const day = String(date.getDate()).padStart(2, "0");
      const hour = date.getHours();
      const minute = date.getMinutes();

      // L'API fournit des données toutes les heures, on crée deux créneaux par heure
      // Créneau à l'heure complète (00)
      const timeSlot00 = formatTimeSlot(hour, 0);
      if (!weatherData[day]) {
        weatherData[day] = {};
      }

      (weatherData[day] as any)[timeSlot00] = {
        temperature: temperature_2m?.[i] ?? null,
        windSpeed: wind_speed_10m?.[i] ?? null,
        windDirection: wind_direction_10m?.[i] ?? null,
        sunshineDuration: sunshine_duration?.[i] ?? null,
      };

      // Créneau à la demi-heure (30) - utiliser la moyenne entre l'heure actuelle et la suivante
      const timeSlot30 = formatTimeSlot(hour, 30);
      const nextIndex = i + 1;
      const nextTemp = temperature_2m?.[nextIndex];
      const nextWindSpeed = wind_speed_10m?.[nextIndex];
      const nextWindDirection = wind_direction_10m?.[nextIndex];
      const nextSunshine = sunshine_duration?.[nextIndex];

      const currentTemp = temperature_2m?.[i];
      const currentWindSpeed = wind_speed_10m?.[i];
      const currentWindDirection = wind_direction_10m?.[i];
      const currentSunshine = sunshine_duration?.[i];

      // Calculer la moyenne pour la demi-heure, ou utiliser la valeur actuelle si la suivante n'existe pas
      (weatherData[day] as any)[timeSlot30] = {
        temperature:
          currentTemp !== null && currentTemp !== undefined
            ? nextTemp !== null && nextTemp !== undefined
              ? (currentTemp + nextTemp) / 2
              : currentTemp
            : null,
        windSpeed:
          currentWindSpeed !== null && currentWindSpeed !== undefined
            ? nextWindSpeed !== null && nextWindSpeed !== undefined
              ? (currentWindSpeed + nextWindSpeed) / 2
              : currentWindSpeed
            : null,
        windDirection:
          currentWindDirection !== null && currentWindDirection !== undefined
            ? nextWindDirection !== null && nextWindDirection !== undefined
              ? // Pour la direction du vent, gérer le cas où on passe de 359° à 0°
                Math.abs(nextWindDirection - currentWindDirection) > 180
                ? ((currentWindDirection + nextWindDirection + 360) / 2) % 360
                : (currentWindDirection + nextWindDirection) / 2
              : currentWindDirection
            : null,
        sunshineDuration:
          currentSunshine !== null && currentSunshine !== undefined
            ? nextSunshine !== null && nextSunshine !== undefined
              ? (currentSunshine + nextSunshine) / 2
              : currentSunshine
            : null,
      };
    }

    // Ajouter les métadonnées
    weatherData._metadata = {
      importedAt: new Date().toISOString(),
      latitude: lat,
      longitude: lon,
    };

    // Sauvegarder le fichier
    const dataDir = path.resolve(process.cwd(), "data", "weather");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const fileName = `${year}-${String(month).padStart(2, "0")}-weather.json`;
    const filePath = path.resolve(dataDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(weatherData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Données météo pour ${year}-${String(month).padStart(2, "0")} importées avec succès`,
      fileName,
    });
  } catch (error) {
    console.error("Error importing weather data:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import des données météo",
      },
      { status: 500 }
    );
  }
}

