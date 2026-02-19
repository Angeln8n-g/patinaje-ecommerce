"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const deliveryIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Blue pulsing dot for driver's current location
function createDriverIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="32" height="32">
    <circle cx="20" cy="20" r="16" fill="#3b82f6" stroke="#fff" stroke-width="3" opacity="0.9"/>
    <circle cx="20" cy="20" r="6" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

const driverIcon = createDriverIcon();

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    }
  }, [positions, map]);
  return null;
}

interface DeliveryPointMapProps {
  deliveryLat: number;
  deliveryLng: number;
  customerName: string;
  address: string;
}

export default function DeliveryPointMap({ deliveryLat, deliveryLng, customerName, address }: DeliveryPointMapProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const update = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => setDriverPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);

  const deliveryPos: [number, number] = [deliveryLat, deliveryLng];
  const allPositions: [number, number][] = [deliveryPos];
  if (driverPos) allPositions.push(driverPos);

  return (
    <div className="h-[200px] w-full rounded-xl overflow-hidden border">
      <MapContainer center={deliveryPos} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={allPositions} />

        {/* Delivery point */}
        <Marker position={deliveryPos} icon={deliveryIcon}>
          <Popup>
            <div className="p-1">
              <p className="font-bold text-sm">📍 {customerName}</p>
              <p className="text-xs text-gray-500">{address}</p>
            </div>
          </Popup>
        </Marker>

        {/* Driver current position */}
        {driverPos && (
          <Marker position={driverPos} icon={driverIcon}>
            <Popup>
              <p className="font-bold text-sm">🏍️ Tu ubicación</p>
            </Popup>
          </Marker>
        )}

        {/* Dashed line between driver and delivery point */}
        {driverPos && (
          <Polyline
            positions={[driverPos, deliveryPos]}
            pathOptions={{ color: "#3b82f6", weight: 2, dashArray: "8 6", opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
