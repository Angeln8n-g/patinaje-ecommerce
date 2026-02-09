"use client";

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DeliveryZone, DeliveryLocation, StoreLocation } from '@/types/skating-store';
import { getDeliveryMenLocations } from '@/lib/skating-store/delivery-actions';
import { getDeliveryZones, getStoreLocation } from '@/lib/skating-store/zone-actions';
import { createClient } from '@/lib/supabase/client';

// Fix leaflet icon issue in Next.js — default blue marker for shipments
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Delivery shipment icon (violet)
const deliveryIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Delivery person location icon (blue)
const deliveryPersonIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Store location icon (red) — differentiated from delivery markers
const storeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Extended delivery location type with profile info
interface DeliveryLocationWithProfile extends DeliveryLocation {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface DeliveryMapProps {
  shipments: any[]; // Using any to include joined order data
}

export default function DeliveryMap({ shipments }: DeliveryMapProps) {
  // Default center (CDMX)
  const center: [number, number] = [19.4326, -99.1332];

  // State for delivery person locations, zones, and store location
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocationWithProfile[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);

  // Fetch delivery locations from server action
  const loadDeliveryLocations = useCallback(async () => {
    try {
      const locations = await getDeliveryMenLocations();
      setDeliveryLocations(locations);
    } catch (error) {
      console.error("Error loading delivery locations:", error);
    }
  }, []);

  // Fetch delivery zones and store location
  const loadZonesAndStore = useCallback(async () => {
    try {
      const [zones, store] = await Promise.all([
        getDeliveryZones(),
        getStoreLocation(),
      ]);
      // Only show active zones
      setDeliveryZones(zones.filter((z) => z.is_active));
      setStoreLocation(store);
    } catch (error) {
      console.error("Error loading zones/store:", error);
    }
  }, []);

  useEffect(() => {
    // Initial data load
    loadDeliveryLocations();
    loadZonesAndStore();

    // Subscribe to delivery_locations changes for real-time updates (Req 4.3)
    const supabase = createClient();
    const channel = supabase
      .channel('delivery-locations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_locations' },
        () => {
          // Re-fetch all delivery locations when any change occurs
          loadDeliveryLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDeliveryLocations, loadZonesAndStore]);

  // Filter only shipments with valid location
  const activeShipments = Array.isArray(shipments) 
    ? shipments.filter(s => s.current_lat && s.current_lng)
    : [];

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ── Delivery Zones as semi-transparent polygons (Req 8.1, 8.3) ── */}
        {deliveryZones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.polygon.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 2,
            }}
          >
            <Tooltip sticky>{zone.name}</Tooltip>
          </Polygon>
        ))}

        {/* ── Store location as differentiated marker (Req 8.2) ── */}
        {storeLocation && (
          <Marker
            position={[storeLocation.lat, storeLocation.lng]}
            icon={storeIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">🏪 Tienda</h3>
                {storeLocation.address && (
                  <p className="text-sm">{storeLocation.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Delivery person positions from delivery_locations (Req 4.2) ── */}
        {deliveryLocations.map((loc) => {
          const name = [loc.first_name, loc.last_name].filter(Boolean).join(' ') || loc.email;
          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={deliveryPersonIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">🚴 {name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Última actualización: {new Date(loc.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* ── Existing shipment markers (preserved) ── */}
        {activeShipments.map((shipment) => (
          <Marker 
            key={shipment.id} 
            position={[shipment.current_lat, shipment.current_lng]}
            icon={deliveryIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">Pedido #{shipment.order.id.slice(0,8)}</h3>
                <p>Repartidor: {shipment.delivery_man_id}</p>
                <p>Estado: {shipment.status}</p>
                <p className="text-xs text-muted-foreground">
                  Actualizado: {new Date(shipment.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
