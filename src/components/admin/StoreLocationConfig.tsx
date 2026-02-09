"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStoreLocation, saveStoreLocation } from "@/lib/skating-store/zone-actions";
import { validateCoordinates } from "@/lib/skating-store/geo-utils";
import { StoreLocation } from "@/types/skating-store";

// Store marker icon (distinct from delivery markers)
const storeIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Default center: Mexico City
const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

/**
 * Inner component that listens for map click events and calls back with the
 * clicked coordinates so the parent can update form state.
 */
function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StoreLocationConfig() {
  // Form state
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Map center — updated when we load or save a location
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Load existing store location on mount
  useEffect(() => {
    async function load() {
      try {
        const location = await getStoreLocation();
        if (location) {
          setLat(String(location.lat));
          setLng(String(location.lng));
          setAddress(location.address ?? "");
          setMapCenter([location.lat, location.lng]);
        }
      } catch (err) {
        console.error("Error loading store location:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handle map click — update lat/lng fields
  const handleMapClick = useCallback((clickLat: number, clickLng: number) => {
    setLat(String(parseFloat(clickLat.toFixed(6))));
    setLng(String(parseFloat(clickLng.toFixed(6))));
    setError(null);
    setSuccess(null);
  }, []);

  // Validate and save
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // Client-side validation
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError("La latitud y longitud deben ser números válidos");
      return;
    }

    const validation = validateCoordinates(latNum, lngNum);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    try {
      const result = await saveStoreLocation(latNum, lngNum, address.trim());
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess("Ubicación de la tienda guardada correctamente");
        setMapCenter([latNum, lngNum]);
      }
    } catch (err) {
      setError("Error al guardar la ubicación. Intente de nuevo.");
      console.error("Save store location error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Derive marker position from current lat/lng values (if valid)
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const hasValidMarker =
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ubicación de la Tienda</CardTitle>
          <CardDescription>Cargando configuración…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubicación de la Tienda</CardTitle>
        <CardDescription>
          Haz clic en el mapa o ingresa las coordenadas manualmente para definir
          la ubicación de la tienda.
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

        {/* ── Map ────────────────────────────────────────────────── */}
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
            <MapClickHandler onClick={handleMapClick} />
            {hasValidMarker && (
              <Marker position={[latNum, lngNum]} icon={storeIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-semibold">Ubicación de la tienda</p>
                    <p className="text-xs">
                      {latNum.toFixed(6)}, {lngNum.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* ── Coordinate inputs ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="store-lat">Latitud</Label>
            <Input
              id="store-lat"
              type="number"
              step="any"
              placeholder="Ej: 19.4326"
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                setError(null);
                setSuccess(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-lng">Longitud</Label>
            <Input
              id="store-lng"
              type="number"
              step="any"
              placeholder="Ej: -99.1332"
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
                setError(null);
                setSuccess(null);
              }}
            />
          </div>
        </div>

        {/* ── Address input ──────────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="store-address">Dirección</Label>
          <Input
            id="store-address"
            type="text"
            placeholder="Dirección de la tienda"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSuccess(null);
            }}
          />
        </div>

        {/* ── Save button ────────────────────────────────────────── */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar ubicación"}
        </Button>
      </CardContent>
    </Card>
  );
}
