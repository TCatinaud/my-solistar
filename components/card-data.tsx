"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CardDataItem = {
  label: string;
  value?: string | number;
  tag?: string;
  size?: "normal" | "small";
};

type CardDataProps = {
  title: string;
  icon: React.ReactNode;
  description: string;
  items: CardDataItem[];
  loading?: boolean;
  error?: boolean;
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

const CardData = React.forwardRef<HTMLDivElement, CardDataProps>(
  ({ title, icon, description, items, loading = false, error = false }, ref) => {
    return (
      <Card ref={ref}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <div className="text-muted-foreground">{icon}</div>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {error ? (
            <div className="text-center py-4 text-muted-foreground">
              Erreur
            </div>
          ) : loading ? (
            <>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex justify-between items-center",
                  item.size === "small" && "text-sm"
                )}
              >
                <span
                  className={cn(
                    "text-muted-foreground",
                    item.size === "small" ? "text-xs" : "text-sm"
                  )}
                >
                  {item.label}
                </span>
                {item.tag ? (
                  <Badge variant={getOriginVariant(item.tag)}>
                    {getOriginLabel(item.tag)}
                  </Badge>
                ) : (
                  <span
                    className={cn(
                      "font-semibold",
                      item.size === "small" ? "text-sm" : "text-lg"
                    )}
                  >
                    {item.value}
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }
);

CardData.displayName = "CardData";

export { CardData };
export type { CardDataItem };

