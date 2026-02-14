"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getDeliveryMenLocations } from "@/lib/skating-store/delivery-actions";
import { getDeliveryZones, getStoreLocation } from "@/lib/skating-store/zone-actions";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

// Icons
const orderIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const pendingOrderIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const deliveredOrderIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const driverIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const storeIcon = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function getOrderIcon(status: string) {
  if (status === "delivered" || status === "cancelled") return deliveredOrderIcon;
  if (status === "shipped" || status === "processing") return orderIcon;
  return pendingOrderIcon;
}

interface OrdersMapProps {
  orders: any[];
}

export default function OrdersMap({ orders }: OrdersMapProps) {
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [storeLocation, setStoreLocation] = useState<any>(null);

  const loadExtras = useCallback(async () => {
    try {
      const [drivers, zoneData, store] = await Promise.all([
        getDeliveryMenLocations(),
        getDeliveryZones(),
        getStoreLocation(),
      ]);
      setDriverLocations(drivers);
      setZones(zoneData.filter((z: any) => z.is_active));
      setStoreLocation(store);
    } catch {}
  }, []);

  useEffect(() => {
    loadExtras();
    const interval = setInterval(async () => {
      try {
        const drivers = await getDeliveryMenLocations();
        setDriverLocations(drivers);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [loadExtras]);

  // Orders with coordinates
  const ordersWithCoords = orders.filter((o) => o.shipping?.lat && o.shipping?.lng);

  // Calculate map center from store location or first order
  const center: [number, number] = storeLocation
    ? [storeLocation.lat, storeLocation.lng]
    : ordersWithCoords.length > 0
      ? [ordersWithCoords[0].shipping.lat, ordersWithCoords[0].shipping.lng]
      : [19.4326, -99.1332];

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Pendiente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> En camino</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Entregado/Cancelado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Repartidor</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Tienda</span>
      </div>

      <div className="h-[500px] w-full rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Delivery zones */}
          {zones.map((zone) => {
            const polygon = typeof zone.polygon === "string" ? JSON.parse(zone.polygon) : zone.polygon;
            return (
              <Polygon
                key={zone.id}
                positions={polygon.map((p: any) => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 2 }}
              >
                <Tooltip sticky>{zone.name}</Tooltip>
              </Polygon>
            );
          })}

          {/* Store */}
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

          {/* Orders */}
          {ordersWithCoords.map((order) => (
            <Marker
              key={order.id}
              position={[order.shipping.lat, order.shipping.lng]}
              icon={getOrderIcon(order.status)}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <p className="font-bold text-sm">📦 #{order.id.slice(0, 8)}</p>
                  <p className="text-xs">{order.customer_name || order.shipping?.fullName}</p>
                  <p className="text-xs text-gray-500">{order.shipping?.address}, {order.shipping?.city}</p>
                  <p className="text-xs font-semibold mt-1">{formatCurrency(order.total)}</p>
                  <p className="text-xs mt-1">
                    Estado: <span className="font-medium">{statusLabels[order.status] || order.status}</span>
                  </p>
                  {order.shipment && (
                    <p className="text-xs">Envío: <span className="font-medium">{order.shipment.status}</span></p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Delivery drivers */}
          {driverLocations.map((loc) => {
            const name = [loc.first_name, loc.last_name].filter(Boolean).join(" ") || loc.email;
            return (
              <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={driverIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-sm">🚴 {name}</p>
                    <p className="text-xs text-gray-500">
                      Última ubicación: {new Date(loc.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
