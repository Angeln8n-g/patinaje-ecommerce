"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { validateDeliveryZone } from "@/lib/skating-store/zone-actions";
import { getDeliveryZones } from "@/lib/skating-store/zone-actions";
import { DeliveryZone } from "@/types/skating-store";
import { CheckCircle2, XCircle, Loader2, LocateFixed, MapPin } from "lucide-react";

// Green marker for in-zone
const inZoneIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Red marker for out-of-zone
const outZoneIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Blue marker (default/loading)
const defaultIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
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

function FlyToPoint({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], zoom ?? 16, { duration: 1 }); }, [lat, lng, zoom, map]);
  return null;
}

export interface DeliveryLocationResult {
  lat: number;
  lng: number;
  inZone: boolean;
  zoneName?: string;
}

interface DeliveryLocationPickerProps {
  onLocationChange: (result: DeliveryLocationResult | null) => void;
  onAddressResolve?: (address: string, city: string) => void;
  disabled?: boolean;
  /** Coordinates from address geocoding — positions the pin without reverse geocoding */
  externalCoords?: { lat: number; lng: number } | null;
  /** When true, allow location selection even without active delivery zones */
  allowWithoutZones?: boolean;
  /** When true, out-of-zone shipping is enabled (charges apply) */
  outOfZoneEnabled?: boolean;
}

/** Reverse geocode coordinates to an address string using Nominatim. */
async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
    );
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      const road = a.road || a.pedestrian || a.footway || "";
      const number = a.house_number || "";
      const neighbourhood = a.neighbourhood || a.suburb || "";
      const address = [road, number, neighbourhood].filter(Boolean).join(", ");
      const city = a.city || a.town || a.village || a.municipality || "";
      return { address: address || data.display_name?.split(",")[0] || "", city };
    }
    return null;
  } catch {
    return null;
  }
}

export default function DeliveryLocationPicker({
  onLocationChange,
  onAddressResolve,
  disabled,
  externalCoords,
  allowWithoutZones,
  outOfZoneEnabled,
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
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

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

  const selectPoint = useCallback(
    async (lat: number, lng: number, doReverse: boolean) => {
      if (disabled) return;

      setSelectedLat(lat);
      setSelectedLng(lng);
      setFlyTo({ lat, lng });
      setValidating(true);
      setValidationResult(null);

      try {
        // If no active zones exist but sales are allowed, skip zone validation
        if (hasActiveZones === false && allowWithoutZones) {
          setValidationResult({ inZone: true });
          onLocationChange({ lat, lng, inZone: true });
        } else {
          const result = await validateDeliveryZone(lat, lng);
          setValidationResult(result);
          onLocationChange({
            lat,
            lng,
            inZone: result.inZone,
            zoneName: result.inZone ? result.zoneName : undefined,
          });
        }
      } catch {
        setValidationResult(null);
        onLocationChange({ lat, lng, inZone: true });
      } finally {
        setValidating(false);
      }

      // Reverse geocode to fill address fields
      if (doReverse && onAddressResolve) {
        const resolved = await reverseGeocode(lat, lng);
        if (resolved) {
          onAddressResolve(resolved.address, resolved.city);
        }
      }
    },
    [disabled, onLocationChange, onAddressResolve]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => selectPoint(lat, lng, true),
    [selectPoint]
  );

  const handleLocateMe = useCallback(async () => {
    if (disabled) return;
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      await selectPoint(position.coords.latitude, position.coords.longitude, true);
    } catch {
      // Geolocation failed — user can still click the map
    } finally {
      setLocating(false);
    }
  }, [disabled, selectPoint]);

  // Determine marker icon based on validation
  const markerIcon = validating
    ? defaultIcon
    : validationResult?.inZone
      ? inZoneIcon
      : validationResult !== null
        ? outZoneIcon
        : defaultIcon;

  // When external coords arrive (from typed address geocoding), position pin without reverse geocode
  const prevExternalRef = useRef<string | null>(null);
  useEffect(() => {
    if (!externalCoords) return;
    const key = `${externalCoords.lat},${externalCoords.lng}`;
    if (prevExternalRef.current === key) return;
    prevExternalRef.current = key;
    selectPoint(externalCoords.lat, externalCoords.lng, false);
  }, [externalCoords, selectPoint]);

  if (hasActiveZones === false && !allowWithoutZones) return null;

  if (hasActiveZones === null) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando mapa de entrega...
      </div>
    );
  }

  const noZonesButAllowed = hasActiveZones === false && allowWithoutZones;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Ubicación de Entrega</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocateMe}
          disabled={disabled || locating}
          className="gap-1.5 text-xs"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {locating ? "Localizando..." : "Usar mi ubicación"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {noZonesButAllowed
          ? "Haz clic en el mapa, usa tu ubicación GPS, o escribe tu dirección arriba para calcular el costo de envío."
          : "Haz clic en el mapa, usa tu ubicación GPS, o escribe tu dirección arriba. Las zonas de entrega están marcadas en azul."
        }
      </p>

      <div className="h-[280px] w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />

          {flyTo && <FlyToPoint lat={flyTo.lat} lng={flyTo.lng} />}

          {zones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.polygon.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.12,
                weight: 2,
              }}
              interactive={false}
            />
          ))}

          {selectedLat !== null && selectedLng !== null && (
            <Marker position={[selectedLat, selectedLng]} icon={markerIcon}>
              <Popup>
                <div className="p-1 text-center">
                  <p className="font-semibold text-sm">
                    {validationResult?.inZone
                      ? (noZonesButAllowed ? "✓ Ubicación seleccionada" : "✓ Dentro de zona")
                      : validationResult !== null ? "✗ Fuera de zona" : "Verificando..."}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Validation status */}
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
                {noZonesButAllowed
                  ? "Ubicación seleccionada. El costo de envío se calculará por distancia."
                  : `¡Ubicación dentro de la zona de entrega${validationResult.zoneName ? ` "${validationResult.zoneName}"` : ""}!`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <XCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Esta ubicación está fuera de la zona de entrega. {outOfZoneEnabled
                  ? "Se aplicarán cargos adicionales por distancia."
                  : "Mueve el pin dentro de las áreas marcadas en azul."
                }
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {selectedLat === null && (
        <p className="text-xs text-muted-foreground italic">
          Selecciona tu ubicación en el mapa o usa el botón de GPS.
        </p>
      )}
    </div>
  );
}
