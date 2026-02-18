"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { getShippingConfig, saveShippingConfig } from "@/lib/skating-store/shipping-actions";
import { validateShippingConfig } from "@/lib/skating-store/geo-utils";
import { ShippingConfig } from "@/types/skating-store";
import { getStoreLocation } from "@/lib/skating-store/zone-actions";

// Default center: Mexico City
const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

// Colors for circles
const BASE_RADIUS_COLOR = "#22c55e"; // green-500
const MAX_DISTANCE_COLOR = "#f97316"; // orange-500

/**
 * Inner component that updates map center when store location changes.
 */
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMapEvents({
    move() {
      // Map will be centered by parent component
    },
  });
  map.setView(center, map.getZoom());
  return null;
}

export default function DeliveryPricingConfig() {
  // Form state
  const [baseRadius, setBaseRadius] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [costPerExtraKm, setCostPerExtraKm] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [outOfZoneEnabled, setOutOfZoneEnabled] = useState(false);
  const [allowSalesWithoutZones, setAllowSalesWithoutZones] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Map center — updated when we load store location
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Load existing configuration on mount
  useEffect(() => {
    async function load() {
      try {
        const config = await getShippingConfig();
        if (config) {
          setBaseRadius(String(config.base_radius_km));
          setBaseRate(String(config.base_rate));
          setCostPerExtraKm(String(config.cost_per_extra_km));
          setMaxDistance(String(config.max_distance_km));
          setOutOfZoneEnabled(config.out_of_zone_enabled);
          setAllowSalesWithoutZones(config.allow_sales_without_zones ?? false);
        }

        // Also load store location for map center
        const storeLocation = await getStoreLocation();
        if (storeLocation) {
          setMapCenter([storeLocation.lat, storeLocation.lng]);
        }
      } catch (err) {
        console.error("Error loading shipping config:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handle form field changes
  const handleBaseRadiusChange = (value: string) => {
    setBaseRadius(value);
    setError(null);
    setSuccess(null);
  };

  const handleBaseRateChange = (value: string) => {
    setBaseRate(value);
    setError(null);
    setSuccess(null);
  };

  const handleCostPerExtraKmChange = (value: string) => {
    setCostPerExtraKm(value);
    setError(null);
    setSuccess(null);
  };

  const handleMaxDistanceChange = (value: string) => {
    setMaxDistance(value);
    setError(null);
    setSuccess(null);
  };

  const handleToggleOutOfZone = (enabled: boolean) => {
    setOutOfZoneEnabled(enabled);
    setError(null);
    setSuccess(null);
  };

  const handleToggleAllowSalesWithoutZones = (enabled: boolean) => {
    setAllowSalesWithoutZones(enabled);
    setError(null);
    setSuccess(null);
  };

  // Validate and save
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const baseRadiusNum = parseFloat(baseRadius);
    const baseRateNum = parseFloat(baseRate);
    const costPerExtraKmNum = parseFloat(costPerExtraKm);
    const maxDistanceNum = parseFloat(maxDistance);

    // Client-side validation
    if (isNaN(baseRadiusNum) || isNaN(baseRateNum) || isNaN(costPerExtraKmNum) || isNaN(maxDistanceNum)) {
      setError("Todos los campos numéricos deben ser válidos");
      return;
    }

    const config: ShippingConfig = {
      base_radius_km: baseRadiusNum,
      base_rate: baseRateNum,
      cost_per_extra_km: costPerExtraKmNum,
      max_distance_km: maxDistanceNum,
      out_of_zone_enabled: outOfZoneEnabled,
      allow_sales_without_zones: allowSalesWithoutZones,
    };

    const validation = validateShippingConfig(config);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    try {
      const result = await saveShippingConfig(config);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess("Configuración de envío guardada correctamente");
      }
    } catch (err) {
      setError("Error al guardar la configuración. Intente de nuevo.");
      console.error("Save shipping config error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Parse numeric values for map circles
  const baseRadiusNum = parseFloat(baseRadius);
  const maxDistanceNum = parseFloat(maxDistance);
  const hasValidConfig = !isNaN(baseRadiusNum) && !isNaN(maxDistanceNum) && baseRadiusNum > 0 && maxDistanceNum > baseRadiusNum;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tarificación de Envío</CardTitle>
          <CardDescription>Cargando configuración…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarificación de Envío</CardTitle>
        <CardDescription>
          Configura los parámetros de tarificación basados en distancia desde la tienda.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Error / Success alerts ─────────────────────────────── */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* ── Map with coverage circles ──────────────────────────── */}
        <div className="h-[400px] w-full rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterUpdater center={mapCenter} />
            
            {/* Base radius circle (green) */}
            {hasValidConfig && (
              <Circle
                center={mapCenter}
                radius={baseRadiusNum * 1000} // Convert km to meters
                pathOptions={{
                  color: BASE_RADIUS_COLOR,
                  fillColor: BASE_RADIUS_COLOR,
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-semibold text-green-700">Radio Base</p>
                    <p className="text-sm">{baseRadiusNum} km</p>
                  </div>
                </Popup>
              </Circle>
            )}

            {/* Max distance circle (orange) */}
            {hasValidConfig && (
              <Circle
                center={mapCenter}
                radius={maxDistanceNum * 1000} // Convert km to meters
                pathOptions={{
                  color: MAX_DISTANCE_COLOR,
                  fillColor: MAX_DISTANCE_COLOR,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 4",
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-semibold text-orange-700">Distancia Máxima</p>
                    <p className="text-sm">{maxDistanceNum} km</p>
                  </div>
                </Popup>
              </Circle>
            )}
          </MapContainer>
        </div>

        {/* ── Configuration form ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base-radius">Radio Base (km)</Label>
            <Input
              id="base-radius"
              type="number"
              step="0.1"
              min="0"
              placeholder="Ej: 5"
              value={baseRadius}
              onChange={(e) => handleBaseRadiusChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Distancia dentro de la cual se aplica la tarifa base
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-rate">Tarifa Base ($)</Label>
            <Input
              id="base-rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 50"
              value={baseRate}
              onChange={(e) => handleBaseRateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-per-extra-km">Costo por km adicional ($)</Label>
            <Input
              id="cost-per-extra-km"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 10"
              value={costPerExtraKm}
              onChange={(e) => handleCostPerExtraKmChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-distance">Distancia Máxima (km)</Label>
            <Input
              id="max-distance"
              type="number"
              step="0.1"
              min="0"
              placeholder="Ej: 20"
              value={maxDistance}
              onChange={(e) => handleMaxDistanceChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Distancia máxima para envíos (debe ser mayor al radio base)
            </p>
          </div>
        </div>

        {/* ── Out of zone toggle ─────────────────────────────────── */}
        <div className="flex items-center justify-between py-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="out-of-zone-enabled">Habilitar envíos fuera de zona</Label>
            <p className="text-xs text-muted-foreground">
              Permitir envíos entre el radio base y la distancia máxima, aplicando cargos adicionales por km
            </p>
          </div>
          <Switch
            id="out-of-zone-enabled"
            checked={outOfZoneEnabled}
            onCheckedChange={handleToggleOutOfZone}
          />
        </div>

        {/* ── Allow sales without zones toggle ───────────────────── */}
        <div className="flex items-center justify-between py-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="allow-sales-without-zones">Permitir ventas sin zonas de entrega</Label>
            <p className="text-xs text-muted-foreground">
              Permite realizar ventas aunque no haya zonas de entrega configuradas o activas. El costo de envío se calcula por distancia.
            </p>
          </div>
          <Switch
            id="allow-sales-without-zones"
            checked={allowSalesWithoutZones}
            onCheckedChange={handleToggleAllowSalesWithoutZones}
          />
        </div>

        {/* ── Save button ────────────────────────────────────────── */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}
