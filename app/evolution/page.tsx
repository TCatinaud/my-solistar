"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

interface FileMetadata {
  fileName: string;
  month: string;
  monthLabel: string;
  isComplete: boolean;
  importedAt: string;
}

type PeriodType = "month" | "range";

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

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("fr-FR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function EvolutionPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<FileMetadata[]>([]);
  const [data, setData] = useState<EvolutionDataPoint[]>([]);
  const [availableSeries, setAvailableSeries] = useState<
    EvolutionResponse["availableSeries"]
  >({
    hotSensor: false,
    coldSensor: false,
    indoorTemp: false,
    outdoorTemp: false,
    weatherTemp: false,
    tankSolar: false,
    tankAdditional: false,
    boiler: false,
    boilerActive: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<{
    hotSensor: boolean;
    coldSensor: boolean;
    indoorTemp: boolean;
    outdoorTemp: boolean;
    weatherTemp: boolean;
    tankSolar: boolean;
    tankAdditional: boolean;
    boiler: boolean;
    boilerActive: boolean;
  }>({
    hotSensor: true,
    coldSensor: true,
    indoorTemp: true,
    outdoorTemp: true,
    weatherTemp: true,
    tankSolar: true,
    tankAdditional: true,
    boiler: true,
    boilerActive: true,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Charger la liste des mois disponibles
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchAvailableMonths = async () => {
      try {
        const response = await fetch("/api/import/files");
        if (response.ok) {
          const result = await response.json();
          setAvailableMonths(result.files || []);
          // Sélectionner le mois le plus récent par défaut
          if (result.files && result.files.length > 0) {
            setSelectedMonth(result.files[0].month);
          }
        }
      } catch (err) {
        console.error("Error fetching available months:", err);
      }
    };

    fetchAvailableMonths();
  }, [isLoaded, isSignedIn]);

  const fetchData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    if (periodType === "month" && !selectedMonth) return;
    if (periodType === "range" && (!startDate || !endDate)) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("periodType", periodType);

      if (periodType === "month" && selectedMonth) {
        const [year, month] = selectedMonth.split("-");
        params.append("year", year);
        params.append("month", month);
      } else if (periodType === "range" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/evolution?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Erreur lors du chargement des données"
        );
      }

      const result: EvolutionResponse = await response.json();
      // Transformer les données booléennes en nombres pour les barres (100% = actif, 0% = inactif)
      const transformedData = result.data.map((point) => ({
        ...point,
        boilerActive: point.boilerActive !== undefined ? (point.boilerActive ? 100 : 0) : undefined,
      }));
      setData(transformedData);
      setAvailableSeries(result.availableSeries);
      // Réinitialiser la visibilité des séries en fonction de celles disponibles
      setVisibleSeries({
        hotSensor: result.availableSeries.hotSensor,
        coldSensor: result.availableSeries.coldSensor,
        indoorTemp: result.availableSeries.indoorTemp,
        outdoorTemp: result.availableSeries.outdoorTemp,
        weatherTemp: result.availableSeries.weatherTemp,
        tankSolar: result.availableSeries.tankSolar,
        tankAdditional: result.availableSeries.tankAdditional,
        boiler: result.availableSeries.boiler,
        boilerActive: result.availableSeries.boilerActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      console.error("Error fetching evolution data:", err);
    } finally {
      setLoading(false);
    }
  }, [periodType, selectedMonth, startDate, endDate, isLoaded, isSignedIn]);

  // Charger les données quand la période change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLoadData = () => {
    fetchData();
  };

  const handleLegendClick = (dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  };

  const seriesColors = {
    hotSensor: "#ef4444", // red
    coldSensor: "#3b82f6", // blue
    indoorTemp: "#10b981", // green
    outdoorTemp: "#f59e0b", // amber
    weatherTemp: "#8b5cf6", // purple
    tankSolar: "#06b6d4", // cyan
    tankAdditional: "#f97316", // orange
    boiler: "#84cc16", // lime
    boilerActive: "#22c55e", // green
  };

  const seriesLabels = {
    hotSensor: "Capteur chaud (panneaux)",
    coldSensor: "Capteur froid (panneaux)",
    indoorTemp: "Température intérieure",
    outdoorTemp: "Température extérieure",
    weatherTemp: "Température météo",
    tankSolar: "Ballon solaire",
    tankAdditional: "Ballon appoint",
    boiler: "Chaudière",
    boilerActive: "Activation chaudière",
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Évolution des données</h1>
        <p className="text-muted-foreground">
          Suivi de l’évolution des capteurs solaires, thermomètres et
          température météo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres de période</CardTitle>
          <CardDescription>
            Sélectionnez la période à afficher sur le graphique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Type de période
              </label>
              <Select
                value={periodType}
                onValueChange={(value) => setPeriodType(value as PeriodType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="range">Plage de dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === "month" && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Mois</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.month} value={month.month}>
                        {month.monthLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === "range" && (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </>
            )}
          </div>

          <Button onClick={handleLoadData} disabled={loading}>
            {loading ? "Chargement..." : "Charger les données"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Graphique d’évolution</CardTitle>
              <CardDescription>
                {data.length} points de données affichés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatTimestamp}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      label={{
                        value: "Température (°C)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        formatTimestamp(value as string)
                      }
                      formatter={(value: number | boolean, name: string) => {
                        if (name === "boilerActive") {
                          return [value === 100 ? "On" : "Off", ""];
                        }
                        if (typeof value === "number") {
                          return [`${value.toFixed(1)} °C`, ""];
                        }
                        return [String(value), ""];
                      }}
                    />
                    <Legend
                      content={({ payload }) => (
                        <div className="flex flex-wrap gap-4 justify-center mt-4">
                          {payload?.map((entry, index) => {
                            if (!entry.dataKey) return null;
                            const keyMap: Record<string, string> = {
                              [seriesLabels.hotSensor]: "hotSensor",
                              [seriesLabels.coldSensor]: "coldSensor",
                              [seriesLabels.indoorTemp]: "indoorTemp",
                              [seriesLabels.outdoorTemp]: "outdoorTemp",
                              [seriesLabels.weatherTemp]: "weatherTemp",
                              [seriesLabels.tankSolar]: "tankSolar",
                              [seriesLabels.tankAdditional]: "tankAdditional",
                              [seriesLabels.boiler]: "boiler",
                              [seriesLabels.boilerActive]: "boilerActive",
                            };
                            const dataKeyStr = String(entry.dataKey);
                            const mappedKey =
                              keyMap[entry.value as string] || dataKeyStr;
                            const isVisible =
                              visibleSeries[
                                mappedKey as keyof typeof visibleSeries
                              ];
                            const isAvailable =
                              availableSeries[
                                mappedKey as keyof typeof availableSeries
                              ];

                            if (!isAvailable) return null;

                            return (
                              <div
                                key={index}
                                onClick={() => handleLegendClick(mappedKey)}
                                className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                                style={{
                                  opacity: isVisible ? 1 : 0.5,
                                }}
                              >
                                <div
                                  style={{
                                    width: "16px",
                                    height: "2px",
                                    backgroundColor: entry.color,
                                  }}
                                />
                                <span className="text-sm">{entry.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    />
                    {availableSeries.boilerActive && (
                      <Bar
                        dataKey="boilerActive"
                        fill={seriesColors.boilerActive}
                        name={seriesLabels.boilerActive}
                        hide={!visibleSeries.boilerActive}
                        fillOpacity={visibleSeries.boilerActive ? 0.5 : 0}
                        isAnimationActive={false}
                      />
                    )}
                    {availableSeries.hotSensor && (
                      <Line
                        type="monotone"
                        dataKey="hotSensor"
                        stroke={seriesColors.hotSensor}
                        name={seriesLabels.hotSensor}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.hotSensor}
                        strokeOpacity={visibleSeries.hotSensor ? 1 : 0}
                      />
                    )}
                    {availableSeries.coldSensor && (
                      <Line
                        type="monotone"
                        dataKey="coldSensor"
                        stroke={seriesColors.coldSensor}
                        name={seriesLabels.coldSensor}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.coldSensor}
                        strokeOpacity={visibleSeries.coldSensor ? 1 : 0}
                      />
                    )}
                    {availableSeries.indoorTemp && (
                      <Line
                        type="monotone"
                        dataKey="indoorTemp"
                        stroke={seriesColors.indoorTemp}
                        name={seriesLabels.indoorTemp}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.indoorTemp}
                        strokeOpacity={visibleSeries.indoorTemp ? 1 : 0}
                      />
                    )}
                    {availableSeries.outdoorTemp && (
                      <Line
                        type="monotone"
                        dataKey="outdoorTemp"
                        stroke={seriesColors.outdoorTemp}
                        name={seriesLabels.outdoorTemp}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.outdoorTemp}
                        strokeOpacity={visibleSeries.outdoorTemp ? 1 : 0}
                      />
                    )}
                    {availableSeries.weatherTemp && (
                      <Line
                        type="monotone"
                        dataKey="weatherTemp"
                        stroke={seriesColors.weatherTemp}
                        name={seriesLabels.weatherTemp}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.weatherTemp}
                        strokeOpacity={visibleSeries.weatherTemp ? 1 : 0}
                      />
                    )}
                    {availableSeries.tankSolar && (
                      <Line
                        type="monotone"
                        dataKey="tankSolar"
                        stroke={seriesColors.tankSolar}
                        name={seriesLabels.tankSolar}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.tankSolar}
                        strokeOpacity={visibleSeries.tankSolar ? 1 : 0}
                      />
                    )}
                    {availableSeries.tankAdditional && (
                      <Line
                        type="monotone"
                        dataKey="tankAdditional"
                        stroke={seriesColors.tankAdditional}
                        name={seriesLabels.tankAdditional}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.tankAdditional}
                        strokeOpacity={visibleSeries.tankAdditional ? 1 : 0}
                      />
                    )}
                    {availableSeries.boiler && (
                      <Line
                        type="monotone"
                        dataKey="boiler"
                        stroke={seriesColors.boiler}
                        name={seriesLabels.boiler}
                        dot={false}
                        strokeWidth={2}
                        hide={!visibleSeries.boiler}
                        strokeOpacity={visibleSeries.boiler ? 1 : 0}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {Object.values(availableSeries).every((v) => !v) && (
            <Card className="border-amber-500">
              <CardHeader>
                <CardTitle className="text-amber-600">
                  Aucune donnée complète
                </CardTitle>
                <CardDescription>
                  Aucune série de données n’est complète sur la période
                  sélectionnée. Veuillez sélectionner une autre période.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}

      {!loading &&
        !error &&
        data.length === 0 &&
        periodType === "month" &&
        selectedMonth && (
          <Card>
            <CardHeader>
              <CardTitle>Aucune donnée</CardTitle>
              <CardDescription>
                Aucune donnée disponible pour la période sélectionnée.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
    </main>
  );
}
