"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getDeliveryMenLocations } from "@/lib/skating-store/delivery-actions";
import { getStoreLocation } from "@/lib/skating-store/zone-actions";

// SVG moto icon factory by color
function createMotoIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36">
    <circle cx="20" cy="20" r="18" fill="${color}" stroke="#fff" stroke-width="2" opacity="0.9"/>
    <g transform="translate(8,10) scale(0.055)" fill="#fff">
      <path d="M400 192h-75.67L289.6 73.6A48 48 0 0 0 244.53 48H179.2a48 48 0 0 0-45.07 25.6L99.67 192H24a24 24 0 0 0-24 24v48a24 24 0 0 0 24 24h8.27A80 80 0 1 0 176 272h72a80 80 0 1 0 143.73 16H400a24 24 0 0 0 24-24v-48a24 24 0 0 0-24-24zM96 336a48 48 0 1 1 48-48 48 48 0 0 1-48 48zm232 0a48 48 0 1 1 48-48 48 48 0 0 1-48 48z"/>
    </g>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const motoGreen = createMotoIcon("#22c55e");   // Activo / Online
const motoYellow = createMotoIcon("#eab308");  // En movimiento / con pedido activo
const motoRed = createMotoIcon("#ef4444");     // Desconectado

const storeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface DriverWithStatus {
  id: string;
  delivery_man_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: "online" | "busy" | "offline";
}

function getDriverStatus(updatedAt: string, activeShipments?: number): "online" | "busy" | "offline" {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins >= 5) return "offline";
  if (activeShipments && activeShipments > 0) return "busy";
  return "online";
}

function getMotoIcon(status: "online" | "busy" | "offline") {
  if (status === "online") return motoGreen;
  if (status === "busy") return motoYellow;
  return motoRed;
}

const STATUS_LABELS: Record<string, string> = {
  online: "Activo",
  busy: "En movimiento",
  offline: "Desconectado",
};

const STATUS_COLORS: Record<string, string> = {
  online: "text-green-600",
  busy: "text-yellow-600",
  offline: "text-red-500",
};

// Auto-fit bounds to show all markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

interface DeliveryAssignmentMapProps {
  activeShipmentsMap?: Record<string, number>; // delivery_man_id -> active shipment count
  selectedDriverId?: string;
  onSelectDriver?: (driverId: string) => void;
}

export default function DeliveryAssignmentMap({
  activeShipmentsMap = {},
  selectedDriverId,
  onSelectDriver,
}: DeliveryAssignmentMapProps) {
  const [drivers, setDrivers] = useState<DriverWithStatus[]>([]);
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [locs, store] = await Promise.all([
        getDeliveryMenLocations(),
        getStoreLocation(),
      ]);
      const driversWithStatus: DriverWithStatus[] = locs.map((loc) => ({
        ...loc,
        status: getDriverStatus(loc.updated_at, activeShipmentsMap[loc.delivery_man_id]),
      }));
      setDrivers(driversWithStatus);
      if (store?.lat && store?.lng) setStoreLocation(store);
    } catch {}
  }, [activeShipmentsMap]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const center: [number, number] = storeLocation
    ? [storeLocation.lat, storeLocation.lng]
    : drivers.length > 0
      ? [drivers[0].lat, drivers[0].lng]
      : [19.4326, -99.1332];

  const allPositions: [number, number][] = [
    ...(storeLocation ? [[storeLocation.lat, storeLocation.lng] as [number, number]] : []),
    ...drivers.map(d => [d.lat, d.lng] as [number, number]),
  ];

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Activo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> En movimiento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Desconectado
        </span>
      </div>

      <div className="h-[250px] w-full rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allPositions.length > 1 && <FitBounds positions={allPositions} />}

          {storeLocation && (
            <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-sm">🏪 Tienda</p>
                  {storeLocation.address && <p className="text-xs">{storeLocation.address}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {drivers.map((driver) => {
            const name = [driver.first_name, driver.last_name].filter(Boolean).join(" ") || driver.email;
            const isSelected = selectedDriverId === driver.delivery_man_id;
            return (
              <Marker
                key={driver.id}
                position={[driver.lat, driver.lng]}
                icon={getMotoIcon(driver.status)}
                eventHandlers={{
                  click: () => onSelectDriver?.(driver.delivery_man_id),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[140px]">
                    <p className="font-bold text-sm">🏍️ {name}</p>
                    <p className={`text-xs font-medium ${STATUS_COLORS[driver.status]}`}>
                      {STATUS_LABELS[driver.status]}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(driver.updated_at).toLocaleTimeString()}
                    </p>
                    {onSelectDriver && (
                      <button
                        className="mt-1 text-xs text-blue-600 hover:underline font-medium"
                        onClick={() => onSelectDriver(driver.delivery_man_id)}
                      >
                        Seleccionar
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {drivers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          No hay repartidores con ubicación conocida
        </p>
      )}
    </div>
  );
}
