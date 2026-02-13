"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateDeliveryZone } from "@/lib/skating-store/zone-actions";
import { getDeliveryZones } from "@/lib/skating-store/zone-actions";
import { DeliveryZone } from "@/types/skating-store";
import { CheckCircle2, XCircle, MapPin, Loader2, Navigation } from "lucide-react";

const deliveryMarkerIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const addressMarkerIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FlyToPoint({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 15, { duration: 1 }); }, [lat, lng, map]);
  return null;
}

export interface DeliveryLocationResult {
  lat: number;
  lng: number;
  inZone: boolean;
  zoneName?: string;
}

export type PickerMode = "auto" | "manual";

interface DeliveryLocationPickerProps {
  onLocationChange: (result: DeliveryLocationResult | null) => void;
  disabled?: boolean;
  /** Address geocoded coordinates (from parent) */
  addressCoords?: { lat: number; lng: number } | null;
  /** Whether the geocoded address is inside a delivery zone */
  addressInZone?: boolean;
  /** Force showing the map for manual point selection (out-of-zone fallback) */
  mode: PickerMode;
}

export default function DeliveryLocationPicker({
  onLocationChange,
  disabled,
  addressCoords,
  addressInZone,
  mode,
}: DeliveryLocationPickerProps) {
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    inZone: boolean;
    zoneName?: string;
  } | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [hasActiveZones, setHasActiveZones] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadZones() {
      try {
        const allZones = await getDeliveryZones();
        const activeZones = allZones.filter((z) => z.is_active);
        setZones(activeZones);
        setHasActiveZones(activeZones.length > 0);
      } catch {
        setHasActiveZones(false);
      }
    }
    loadZones();
  }, []);

  // Reset manual selection when mode changes back to auto
  useEffect(() => {
    if (mode === "auto") {
      setSelectedLat(null);
      setSelectedLng(null);
      setValidationResult(null);
    }
  }, [mode]);

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      if (disabled || mode !== "manual") return;

      setSelectedLat(lat);
      setSelectedLng(lng);
      setValidating(true);
      setValidationResult(null);

      try {
        const result = await validateDeliveryZone(lat, lng);
        setValidationResult(result);
        onLocationChange({
          lat,
          lng,
          inZone: result.inZone,
          zoneName: result.inZone ? result.zoneName : undefined,
        });
      } catch {
        setValidationResult(null);
        onLocationChange({ lat, lng, inZone: true });
      } finally {
        setValidating(false);
      }
    },
    [disabled, mode, onLocationChange]
  );

  // In auto mode, don't render the map at all
  if (mode === "auto") return null;

  if (hasActiveZones === false) return null;

  if (hasActiveZones === null) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando mapa de entrega...
      </div>
    );
  }

  const mapCenter: [number, number] = addressCoords
    ? [addressCoords.lat, addressCoords.lng]
    : DEFAULT_CENTER;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-medium">Selecciona un punto de encuentro</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Tu dirección está fuera de la zona de entrega. Haz clic en el mapa para
        seleccionar un punto de encuentro dentro de las zonas marcadas.
      </p>

      <div className="h-[250px] w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={mapCenter}
          zoom={addressCoords ? 15 : DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />

          {addressCoords && (
            <FlyToPoint lat={addressCoords.lat} lng={addressCoords.lng} />
          )}

          {zones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 2,
              }}
            >
              <Popup>{zone.name}</Popup>
            </Polygon>
          ))}

          {/* Address marker (red) */}
          {addressCoords && (
            <Marker position={[addressCoords.lat, addressCoords.lng]} icon={addressMarkerIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-semibold text-red-600">Tu dirección (fuera de zona)</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Selected meeting point (blue) */}
          {selectedLat !== null && selectedLng !== null && (
            <Marker position={[selectedLat, selectedLng]} icon={deliveryMarkerIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-semibold">Punto de encuentro</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {validating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando zona de entrega...
        </div>
      )}

      {!validating && validationResult !== null && (
        <>
          {validationResult.inZone ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ¡Punto de encuentro dentro de la zona
                {validationResult.zoneName ? ` "${validationResult.zoneName}"` : ""}!
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Este punto también está fuera de la zona. Selecciona un punto dentro
                de las áreas marcadas en azul.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {selectedLat === null && (
        <p className="text-xs text-muted-foreground italic">
          Haz clic dentro de una zona azul para seleccionar tu punto de encuentro.
        </p>
      )}
    </div>
  );
}
