"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Shipment } from '@/types/skating-store';

// Fix leaflet icon issue in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Delivery Icon (different color if possible, but standard is fine for now)
const deliveryIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface DeliveryMapProps {
  shipments: any[]; // Using any to include joined order data
}

export default function DeliveryMap({ shipments }: DeliveryMapProps) {
  // Default center (CDMX) or user location
  const center: [number, number] = [19.4326, -99.1332];

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
