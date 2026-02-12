"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { DeliveryZone, DeliveryLocation, StoreLocation } from "@/types/skating-store";
import { getDeliveryMenLocations } from "@/lib/skating-store/delivery-actions";
import { getDeliveryZones, getStoreLocation } from "@/lib/skating-store/zone-actions";

const icon = L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const deliveryIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const deliveryPersonIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const storeIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

interface DeliveryLocationWithProfile extends DeliveryLocation { first_name: string | null; last_name: string | null; email: string; }
interface DeliveryMapProps { shipments: any[]; }

export default function DeliveryMap({ shipments }: DeliveryMapProps) {
  const center: [number, number] = [19.4326, -99.1332];
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocationWithProfile[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);

  const loadDeliveryLocations = useCallback(async () => {
    try { setDeliveryLocations(await getDeliveryMenLocations()); } catch {}
  }, []);

  const loadZonesAndStore = useCallback(async () => {
    try {
      const [zones, store] = await Promise.all([getDeliveryZones(), getStoreLocation()]);
      setDeliveryZones(zones.filter((z) => z.is_active));
      setStoreLocation(store);
    } catch {}
  }, []);

  useEffect(() => {
    loadDeliveryLocations();
    loadZonesAndStore();
    // Poll every 10 seconds for location updates (replaces Supabase realtime)
    const interval = setInterval(loadDeliveryLocations, 10000);
    return () => clearInterval(interval);
  }, [loadDeliveryLocations, loadZonesAndStore]);

  const activeShipments = Array.isArray(shipments) ? shipments.filter((s) => s.current_lat && s.current_lng) : [];

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {deliveryZones.map((zone) => {
          const polygon = typeof zone.polygon === "string" ? JSON.parse(zone.polygon) : zone.polygon;
          return (
            <Polygon key={zone.id} positions={polygon.map((p: any) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}>
              <Tooltip sticky>{zone.name}</Tooltip>
            </Polygon>
          );
        })}
        {storeLocation && (
          <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
            <Popup><div className="p-2"><h3 className="font-bold">🏪 Tienda</h3>{storeLocation.address && <p className="text-sm">{storeLocation.address}</p>}</div></Popup>
          </Marker>
        )}
        {deliveryLocations.map((loc) => {
          const name = [loc.first_name, loc.last_name].filter(Boolean).join(" ") || loc.email;
          return (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={deliveryPersonIcon}>
              <Popup><div className="p-2"><h3 className="font-bold">🚴 {name}</h3><p className="text-xs text-muted-foreground">Última actualización: {new Date(loc.updated_at).toLocaleTimeString()}</p></div></Popup>
            </Marker>
          );
        })}
        {activeShipments.map((shipment) => (
          <Marker key={shipment.id} position={[shipment.current_lat, shipment.current_lng]} icon={deliveryIcon}>
            <Popup><div className="p-2"><h3 className="font-bold">Pedido #{shipment.order.id.slice(0, 8)}</h3><p>Estado: {shipment.status}</p><p className="text-xs text-muted-foreground">Actualizado: {new Date(shipment.updated_at).toLocaleTimeString()}</p></div></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
