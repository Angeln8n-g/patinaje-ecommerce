"use client";

import { ShippingCostResult, ShippingConfig } from "@/types/skating-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

// Helper function to format distance
function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

interface ShippingBreakdownProps {
  result: ShippingCostResult;
  config: ShippingConfig;
}

export function ShippingBreakdown({ result, config }: ShippingBreakdownProps) {
  const { zone_type, distance_km, base_radius_km, base_rate, extra_km, extra_charge, total_cost, max_distance_km, out_of_zone_enabled } = result;

  // Render for "within_zone" - inside base radius
  if (zone_type === "within_zone") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Envío dentro de zona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Distancia:</span>
            <span className="font-medium">{formatDistance(distance_km)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tarifa base:</span>
            <span className="font-medium">{formatCurrency(base_rate)}</span>
          </div>
          <div className="pt-3 border-t flex justify-between text-base font-semibold">
            <span>Total envío:</span>
            <span>{formatCurrency(total_cost)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render for "out_of_range" - beyond max distance
  if (zone_type === "out_of_range") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="mt-2">
          <p className="font-semibold">Fuera de alcance</p>
          <p className="mt-1">
            La dirección del cliente está fuera del alcance de entrega. La distancia máxima permitida es {formatDistance(max_distance_km)}, pero la dirección está a {formatDistance(distance_km)}.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Render for "out_of_zone" - between base radius and max distance
  if (zone_type === "out_of_zone") {
    // Check if out-of-zone shipping is enabled
    if (!out_of_zone_enabled) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="mt-2">
            <p className="font-semibold">Fuera de zona de cobertura</p>
            <p className="mt-1">
              La dirección del cliente está fuera del radio base ({formatDistance(base_radius_km)}). Los envíos fuera de zona están actualmente deshabilitados.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Info className="h-5 w-5" />
            Envío fuera de zona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Distancia total:</span>
            <span className="font-medium">{formatDistance(distance_km)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Radio base:</span>
            <span className="font-medium">{formatDistance(base_radius_km)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kilómetros excedentes:</span>
            <span className="font-medium">{formatDistance(extra_km)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tarifa base:</span>
            <span className="font-medium">{formatCurrency(base_rate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recargo por km adicional:</span>
            <span className="font-medium">{formatCurrency(extra_charge)}</span>
          </div>
          <div className="pt-3 border-t flex justify-between text-base font-semibold">
            <span>Total envío:</span>
            <span>{formatCurrency(total_cost)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for unexpected zone types
  return (
    <Alert>
      <AlertCircle className="h-5 w-5" />
      <AlertDescription>
        No se pudo calcular el costo de envío. Por favor, intenta de nuevo.
      </AlertDescription>
    </Alert>
  );
}
