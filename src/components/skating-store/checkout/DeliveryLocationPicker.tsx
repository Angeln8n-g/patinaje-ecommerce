"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateDeliveryZone } from "@/lib/skating-store/zone-actions";
import { getDeliveryZones } from "@/lib/skating-store/zone-actions";
import { DeliveryZone } from "@/types/skating-store";
import { CheckCircle2, XCircle, MapPin, Loader2 } from "lucide-react";

// Customer delivery marker icon (blue)
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

// Default center: Mexico City
const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

/**
 * Inner component that listens for map click events.
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

export interface DeliveryLocationResult {
  lat: number;
  lng: number;
  inZone: boolean;
  zoneName?: string;
}

interface DeliveryLocationPickerProps {
  onLocationChange: (result: DeliveryLocationResult | null) => void;
  disabled?: boolean;
}

export default function DeliveryLocationPicker({
  onLocationChange,
  disabled,
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

  // Load active delivery zones on mount to display on the map
  useEffect(() => {
    async function loadZones() {
      try {
        const allZones = await getDeliveryZones();
        const activeZones = allZones.filter((z) => z.is_active);
        setZones(activeZones);
        setHasActiveZones(activeZones.length > 0);
      } catch {
        // If we can't load zones, graceful degradation
        setHasActiveZones(false);
      }
    }
    loadZones();
  }, []);

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      if (disabled) return;

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
        // On error, allow the order (graceful degradation)
        setValidationResult(null);
        onLocationChange({ lat, lng, inZone: true });
      } finally {
        setValidating(false);
      }
    },
    [disabled, onLocationChange]
  );

  // If no active zones are configured, don't show the map (graceful degradation)
  if (hasActiveZones === false) {
    return null;
  }

  // Still loading zones
  if (hasActiveZones === null) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando mapa de entrega...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          Ubicación de Entrega
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para seleccionar tu ubicación de entrega y verificar
        que esté dentro de nuestra zona de cobertura.
      </p>

      {/* Map */}
      <div className="h-[250px] w-full rounded-lg overflow-hidden border">
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

          {/* Render active delivery zones as polygons */}
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

          {/* Selected location marker */}
          {selectedLat !== null && selectedLng !== null && (
            <Marker
              position={[selectedLat, selectedLng]}
              icon={deliveryMarkerIcon}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-semibold">Tu ubicación de entrega</p>
                  <p className="text-xs">
                    {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
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
                ¡Tu ubicación está dentro de la zona de entrega
                {validationResult.zoneName
                  ? ` "${validationResult.zoneName}"`
                  : ""}
                ! Puedes continuar con tu pedido.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Tu ubicación no está dentro de nuestra área de cobertura. Por
                favor selecciona una ubicación dentro de las zonas de entrega
                marcadas en el mapa.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {selectedLat === null && (
        <p className="text-xs text-muted-foreground italic">
          Selecciona tu ubicación en el mapa para continuar.
        </p>
      )}
    </div>
  );
}
