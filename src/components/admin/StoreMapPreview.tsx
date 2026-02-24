"use client";

import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Store, DeliveryZone } from "@/types/skating-store";

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Props {
  stores: Store[];
  zones: DeliveryZone[];
}

export default function StoreMapPreview({ stores, zones }: Props) {
  // Center on first store with coords, or default
  const center: [number, number] = (() => {
    const s = stores.find((st) => st.lat && st.lng);
    return s ? [Number(s.lat), Number(s.lng)] : [19.4326, -99.1332];
  })();

  // Build a map of zone_id -> store color for zones assigned to stores
  // (zones without store assignment use their own color or default blue)

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border" style={{ position: "relative", zIndex: 0 }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Delivery zones */}
        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.polygon.map((v) => [v.lat, v.lng] as [number, number])}
            pathOptions={{
              color: zone.color || "#3b82f6",
              fillColor: zone.color || "#3b82f6",
              fillOpacity: 0.15,
              weight: 2,
            }}
          >
            <Popup><span className="font-medium">{zone.name}</span></Popup>
          </Polygon>
        ))}

        {/* Store markers */}
        {stores
          .filter((s) => s.lat && s.lng)
          .map((store) => (
            <Marker key={store.id} position={[Number(store.lat), Number(store.lng)]} icon={defaultIcon}>
              <Popup>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: store.color }} />
                  <span className="font-semibold">{store.name}</span>
                </div>
                {store.address && <p className="text-xs mt-1">{store.address}</p>}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
