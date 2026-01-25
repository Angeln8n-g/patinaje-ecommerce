"use client";

import { Shipment, ShipmentStatus } from "@/types/skating-store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Package, Navigation } from "lucide-react";
import { updateShipmentStatus } from "@/lib/skating-store/delivery-actions";
import { toast } from "sonner";
import { useState } from "react";

interface ShipmentCardProps {
  shipment: any; // Using any for now to handle joined data easily
  onUpdate: () => void;
}

export function ShipmentCard({ shipment, onUpdate }: ShipmentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const order = shipment.order;
  const shipping = order.shipping;

  const handleStatusUpdate = async (newStatus: ShipmentStatus) => {
    setIsLoading(true);
    try {
      // Get current location if possible
      let lat, lng;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (e) {
          console.warn("Could not get location for status update");
        }
      }

      await updateShipmentStatus(shipment.id, newStatus, lat, lng);
      toast.success(`Estado actualizado a ${newStatus}`);
      onUpdate();
    } catch (error) {
      toast.error("Error al actualizar estado");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case 'ASIGNADO': return 'secondary';
      case 'EN_RUTA': return 'default'; // blue-ish usually
      case 'CERCA': return 'warning'; // yellow-ish? default warning variant might not exist, using outline or secondary
      case 'ENTREGADO': return 'outline'; // green-ish usually
      default: return 'default';
    }
  };

  const openMap = () => {
    const query = encodeURIComponent(`${shipping.address}, ${shipping.city}, ${shipping.postalCode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
          <Badge variant={getStatusColor(shipment.status) as any}>{shipment.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <UsersIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="font-medium">{shipping.fullName}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p>{shipping.address}</p>
            <p className="text-muted-foreground">{shipping.city}, {shipping.postalCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${shipping.phone}`} className="text-blue-600 hover:underline">
            {shipping.phone}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{order.items.length} items - ${order.total}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button variant="outline" className="w-full" onClick={openMap}>
          <Navigation className="mr-2 h-4 w-4" />
          Abrir Mapa
        </Button>
        
        {shipment.status === 'ASIGNADO' && (
          <Button className="w-full" onClick={() => handleStatusUpdate('EN_RUTA')} disabled={isLoading}>
            Iniciar Ruta
          </Button>
        )}
        
        {shipment.status === 'EN_RUTA' && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="secondary" onClick={() => handleStatusUpdate('CERCA')} disabled={isLoading}>
              Cerca
            </Button>
            <Button onClick={() => handleStatusUpdate('ENTREGADO')} disabled={isLoading}>
              Entregado
            </Button>
          </div>
        )}

        {shipment.status === 'CERCA' && (
          <Button className="w-full" onClick={() => handleStatusUpdate('ENTREGADO')} disabled={isLoading}>
            Confirmar Entrega
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
