import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

interface SolistarData {
  _metadata?: {
    isComplete: boolean;
    importedAt: string;
  };
  [day: string]:
    | {
        [timeSlot: string]: {
          panels: {
            hotSensor: number;
            coldSensor: number;
          };
          thermometer: {
            outdoor: number;
            indoor: number;
          };
        };
      }
    | {
        isComplete?: boolean;
        importedAt?: string;
      }
    | undefined;
}

interface WeatherData {
  _metadata?: {
    importedAt: string;
    latitude?: number;
    longitude?: number;
  };
  [day: string]:
    | {
        [timeSlot: string]: {
          temperature: number;
        };
      }
    | {
        importedAt?: string;
        latitude?: number;
        longitude?: number;
      }
    | undefined;
}

interface EvolutionDataPoint {
  timestamp: string;
  hotSensor?: number;
  coldSensor?: number;
  indoorTemp?: number;
  outdoorTemp?: number;
  weatherTemp?: number;
  tankSolar?: number;
  tankAdditional?: number;
  boiler?: number;
  boilerActive?: boolean;
}

interface EvolutionResponse {
  data: EvolutionDataPoint[];
  availableSeries: {
    hotSensor: boolean;
    coldSensor: boolean;
    indoorTemp: boolean;
    outdoorTemp: boolean;
    weatherTemp: boolean;
    tankSolar: boolean;
    tankAdditional: boolean;
    boiler: boolean;
    boilerActive: boolean;
  };
}

const getAllTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}00`);
    slots.push(`${String(hour).padStart(2, "0")}30`);
  }
  return slots;
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const getDaysInRange = (startDate: Date, endDate: Date): Array<{ day: string; year: number; month: number }> => {
  const days: Array<{ day: string; year: number; month: number }> = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({
      day: String(current.getDate()).padStart(2, "0"),
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
};

type DayDataSolistar = {
  [timeSlot: string]: {
    panels: {
      hotSensor: number;
      coldSensor: number;
    };
    tank: {
      solar: number;
      additional: number;
    };
    boiler: {
      active: boolean;
      temperature: number;
    };
    thermometer: {
      outdoor: number;
      indoor: number;
    };
  };
};

type DayDataWeather = {
  [timeSlot: string]: {
    temperature: number | null;
  };
};

const isDayDataSolistar = (
  value: any
): value is DayDataSolistar => {
  return value && typeof value === "object" && !value.isComplete && !value.importedAt && !value.latitude && !value.longitude;
};

const isDayDataWeather = (
  value: any
): value is DayDataWeather => {
  return value && typeof value === "object" && !value.isComplete && !value.importedAt && !value.latitude && !value.longitude;
};

const loadSolistarData = (
  year: number,
  month: number
): SolistarData | null => {
  const fileName = `${year}-${String(month).padStart(2, "0")}-solistar.json`;
  const filePath = path.resolve(process.cwd(), "data", "solistar", fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as SolistarData;
  } catch (error) {
    console.error(`Error loading solistar data from ${fileName}:`, error);
    return null;
  }
};

const loadWeatherData = (
  year: number,
  month: number
): WeatherData | null => {
  const fileName = `${year}-${String(month).padStart(2, "0")}-weather.json`;
  const filePath = path.resolve(process.cwd(), "data", "weather", fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as WeatherData;
  } catch (error) {
    console.error(`Error loading weather data from ${fileName}:`, error);
    return null;
  }
};

const checkSeriesCompleteness = (
  dataPoints: EvolutionDataPoint[],
  seriesKey: keyof Omit<EvolutionDataPoint, "timestamp">
): boolean => {
  // Une série est considérée comme complète si elle a des données pour au moins 50% des points
  // Cela permet d'afficher les données météo qui n'ont que des créneaux horaires complets
  const pointsWithData = dataPoints.filter((point) => point[seriesKey] !== undefined);
  return pointsWithData.length > 0 && pointsWithData.length >= dataPoints.length * 0.5;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("periodType"); // "year", "month", "range"
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let targetDays: string[] = [];
    let targetYear: number;
    let targetMonth: number;

    // Déterminer la période cible
    if (periodType === "year" && year) {
      targetYear = parseInt(year);
      if (isNaN(targetYear)) {
        return NextResponse.json(
          { error: "Année invalide" },
          { status: 400 }
        );
      }
      // Pour une année, on va charger tous les mois disponibles
      // Pour simplifier, on va demander un mois spécifique ou gérer mois par mois
      return NextResponse.json(
        { error: "La sélection par année nécessite un mois spécifique" },
        { status: 400 }
      );
    } else if (periodType === "month" && year && month) {
      targetYear = parseInt(year);
      targetMonth = parseInt(month);
      if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
        return NextResponse.json(
          { error: "Année ou mois invalide" },
          { status: 400 }
        );
      }
      const daysInMonth = getDaysInMonth(targetYear, targetMonth);
      targetDays = Array.from({ length: daysInMonth }, (_, i) =>
        String(i + 1).padStart(2, "0")
      );

      // Charger les données solistar et météo (pour mois uniquement)
      const solistarData = loadSolistarData(targetYear, targetMonth);
      const weatherData = loadWeatherData(targetYear, targetMonth);

      if (!solistarData && !weatherData) {
        return NextResponse.json(
          { error: "Aucune donnée disponible pour cette période" },
          { status: 404 }
        );
      }

      // Générer tous les créneaux horaires attendus
      const allTimeSlots = getAllTimeSlots();
      const dataPoints: EvolutionDataPoint[] = [];

      // Pour chaque jour et chaque créneau horaire
      for (const day of targetDays) {
        for (const timeSlot of allTimeSlots) {
          // Construire le timestamp ISO
          const date = new Date(targetYear, targetMonth - 1, parseInt(day));
          const [hour, minute] = [
            parseInt(timeSlot.substring(0, 2)),
            parseInt(timeSlot.substring(2, 4)),
          ];
          date.setHours(hour, minute, 0, 0);
          const timestamp = date.toISOString();

          const point: EvolutionDataPoint = { timestamp };

          // Ajouter les données solistar si disponibles
          if (solistarData) {
            const dayData = solistarData[day];
            if (isDayDataSolistar(dayData) && dayData[timeSlot]) {
              point.hotSensor = dayData[timeSlot].panels?.hotSensor;
              point.coldSensor = dayData[timeSlot].panels?.coldSensor;
              point.indoorTemp = dayData[timeSlot].thermometer?.indoor;
              point.outdoorTemp = dayData[timeSlot].thermometer?.outdoor;
              point.tankSolar = dayData[timeSlot].tank?.solar;
              point.tankAdditional = dayData[timeSlot].tank?.additional;
              point.boiler = dayData[timeSlot].boiler?.temperature;
              point.boilerActive = dayData[timeSlot].boiler?.active;
            }
          }

          // Ajouter les données météo si disponibles
          if (weatherData) {
            const dayData = weatherData[day];
            if (isDayDataWeather(dayData) && dayData[timeSlot]) {
              const temp = dayData[timeSlot].temperature;
              // Ne prendre que les valeurs non-null
              if (temp !== null && temp !== undefined) {
                point.weatherTemp = temp;
              }
            }
          }

          dataPoints.push(point);
        }
      }

      // Vérifier la complétude de chaque série
      const availableSeries = {
        hotSensor: checkSeriesCompleteness(dataPoints, "hotSensor"),
        coldSensor: checkSeriesCompleteness(dataPoints, "coldSensor"),
        indoorTemp: checkSeriesCompleteness(dataPoints, "indoorTemp"),
        outdoorTemp: checkSeriesCompleteness(dataPoints, "outdoorTemp"),
        weatherTemp: checkSeriesCompleteness(dataPoints, "weatherTemp"),
        tankSolar: checkSeriesCompleteness(dataPoints, "tankSolar"),
        tankAdditional: checkSeriesCompleteness(dataPoints, "tankAdditional"),
        boiler: checkSeriesCompleteness(dataPoints, "boiler"),
        boilerActive: checkSeriesCompleteness(dataPoints, "boilerActive"),
      };

      // Filtrer les points qui n'ont aucune donnée
      const filteredDataPoints = dataPoints.filter(
        (point) =>
          point.hotSensor !== undefined ||
          point.coldSensor !== undefined ||
          point.indoorTemp !== undefined ||
          point.outdoorTemp !== undefined ||
          point.weatherTemp !== undefined ||
          point.tankSolar !== undefined ||
          point.tankAdditional !== undefined ||
          point.boiler !== undefined ||
          point.boilerActive !== undefined
      );

      const response: EvolutionResponse = {
        data: filteredDataPoints,
        availableSeries,
      };

      return NextResponse.json(response);
    } else if (periodType === "range" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return NextResponse.json(
          { error: "Dates invalides" },
          { status: 400 }
        );
      }
      // Pour les plages, on va traiter différemment
      const rangeDays = getDaysInRange(start, end);
      
      // Générer tous les créneaux horaires attendus
      const allTimeSlots = getAllTimeSlots();
      const dataPoints: EvolutionDataPoint[] = [];

      // Pour chaque jour dans la plage
      for (const { day, year, month } of rangeDays) {
        // Charger les données pour ce mois spécifique
        const solistarData = loadSolistarData(year, month);
        const weatherData = loadWeatherData(year, month);

        for (const timeSlot of allTimeSlots) {
          // Construire le timestamp ISO
          const date = new Date(year, month - 1, parseInt(day));
          const [hour, minute] = [
            parseInt(timeSlot.substring(0, 2)),
            parseInt(timeSlot.substring(2, 4)),
          ];
          date.setHours(hour, minute, 0, 0);
          const timestamp = date.toISOString();

          const point: EvolutionDataPoint = { timestamp };

          // Ajouter les données solistar si disponibles
          if (solistarData) {
            const dayData = solistarData[day];
            if (isDayDataSolistar(dayData) && dayData[timeSlot]) {
              point.hotSensor = dayData[timeSlot].panels?.hotSensor;
              point.coldSensor = dayData[timeSlot].panels?.coldSensor;
              point.indoorTemp = dayData[timeSlot].thermometer?.indoor;
              point.outdoorTemp = dayData[timeSlot].thermometer?.outdoor;
              point.tankSolar = dayData[timeSlot].tank?.solar;
              point.tankAdditional = dayData[timeSlot].tank?.additional;
              point.boiler = dayData[timeSlot].boiler?.temperature;
              point.boilerActive = dayData[timeSlot].boiler?.active;
            }
          }

          // Ajouter les données météo si disponibles
          if (weatherData) {
            const dayData = weatherData[day];
            if (isDayDataWeather(dayData) && dayData[timeSlot]) {
              const temp = dayData[timeSlot].temperature;
              // Ne prendre que les valeurs non-null
              if (temp !== null && temp !== undefined) {
                point.weatherTemp = temp;
              }
            }
          }

          // Ne garder que les points qui ont au moins une donnée
          if (
            point.hotSensor !== undefined ||
            point.coldSensor !== undefined ||
            point.indoorTemp !== undefined ||
            point.outdoorTemp !== undefined ||
            point.weatherTemp !== undefined ||
            point.tankSolar !== undefined ||
            point.tankAdditional !== undefined ||
            point.boiler !== undefined ||
          point.boilerActive !== undefined
          ) {
            dataPoints.push(point);
          }
        }
      }

      // Vérifier la complétude de chaque série
      const availableSeries = {
        hotSensor: checkSeriesCompleteness(dataPoints, "hotSensor"),
        coldSensor: checkSeriesCompleteness(dataPoints, "coldSensor"),
        indoorTemp: checkSeriesCompleteness(dataPoints, "indoorTemp"),
        outdoorTemp: checkSeriesCompleteness(dataPoints, "outdoorTemp"),
        weatherTemp: checkSeriesCompleteness(dataPoints, "weatherTemp"),
        tankSolar: checkSeriesCompleteness(dataPoints, "tankSolar"),
        tankAdditional: checkSeriesCompleteness(dataPoints, "tankAdditional"),
        boiler: checkSeriesCompleteness(dataPoints, "boiler"),
        boilerActive: checkSeriesCompleteness(dataPoints, "boilerActive"),
      };

      const response: EvolutionResponse = {
        data: dataPoints,
        availableSeries,
      };

      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { error: "Paramètres de période invalides" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in evolution API:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

