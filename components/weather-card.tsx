"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type WeatherCurrent = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
};

type WeatherToday = {
  tempMin: number;
  tempMax: number;
};

type WeatherHourly = {
  time: string;
  temperature: number;
  weatherCode: number;
};

type WeatherDaily = {
  date: string;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
};

type WeatherCardProps = {
  current?: WeatherCurrent;
  today?: WeatherToday;
  hourly?: WeatherHourly[];
  daily?: WeatherDaily[];
  loading?: boolean;
  error?: boolean;
  getWeatherIcon: (weatherCode: number, isNight?: boolean) => React.ReactNode;
  getWindDirection: (degrees: number) => string;
  isNightTime: () => boolean;
  formatForecastDate: (dateString: string) => string;
  className?: string;
};

const formatHour = (timeString: string): string => {
  const date = new Date(timeString);
  const hour = date.getHours();
  return `${hour}h`;
};

const WindArrow = ({ degrees }: { degrees: number }) => {
  // La direction du vent en degrés (0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest)
  // On ajoute 180° pour pointer vers où va le vent (au lieu d'où il vient)
  // Puis on soustrait 90° car en SVG, 0° pointe vers la droite
  const rotation = (degrees + 180 - 90) % 360;

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="inline-block"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d="M10 2 L10 18 M10 2 L6 6 M10 2 L14 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export const WeatherCard = React.forwardRef<HTMLDivElement, WeatherCardProps>(
  (
    {
      current,
      today,
      hourly,
      daily,
      loading = false,
      error = false,
      getWeatherIcon: getWeatherIconProp,
      getWindDirection,
      isNightTime,
      formatForecastDate,
      className,
    },
    ref
  ) => {
    const getIcon = getWeatherIconProp;

    if (error) {
      return (
        <Card ref={ref} className={className}>
          <CardContent>
            <div className="text-center text-muted-foreground">Erreur</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref} className={className}>
        <CardHeader>
          <CardTitle>Météo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Section actuelle - Grande partie à gauche */}
              <div className="flex-1 min-w-[200px]">
                {current && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-[150px] min-w-[150px] h-[150px] flex items-center justify-center [&>svg]:w-[150px] [&>svg]:h-[150px]">
                        {getIcon(current.weatherCode, isNightTime())}
                      </div>
                      <div>
                        <div className="text-4xl md:text-5xl font-bold">
                          {Math.round(current.temperature)}°
                        </div>
                        {today && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {Math.round(today.tempMin)}° /{" "}
                            {Math.round(today.tempMax)}°
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Vent</span>
                        <span className="font-semibold flex items-center gap-2">
                          <WindArrow degrees={current.windDirection} />
                          {Math.round(current.windSpeed)} km/h{" "}
                          {getWindDirection(current.windDirection)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prévisions - Partie à droite */}
              <div className="flex-1 md:border-l md:pl-6 pt-4 md:pt-0 space-y-6">
                {/* Prévisions horaires */}
                {hourly && hourly.length > 0 && (
                  <div>
                    <div className="grid grid-cols-7 gap-2">
                      {hourly.map((hour, index) => {
                        const hourStr = formatHour(hour.time);
                        const hourNum = new Date(hour.time).getHours();
                        const isNight = hourNum < 6 || hourNum >= 20;

                        return (
                          <div
                            key={index}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="text-xs text-muted-foreground font-medium">
                              {hourStr}
                            </div>
                            <div className="text-xl md:text-2xl">
                              {getIcon(hour.weatherCode, isNight)}
                            </div>
                            <div className="text-sm font-semibold text-blue-600">
                              {Math.round(hour.temperature)}°
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prévisions des 3 jours suivants */}
                {daily && daily.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">
                      Prochains jours
                    </div>
                    <div className="space-y-2">
                      {daily.slice(0, 3).map((day, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-lg">
                              {getIcon(day.weatherCode, false)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {formatForecastDate(day.date)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {Math.round(day.windSpeed)} km/h{" "}
                                {getWindDirection(day.windDirection)}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                            {Math.round(day.tempMin)}° /{" "}
                            {Math.round(day.tempMax)}°
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

WeatherCard.displayName = "WeatherCard";
