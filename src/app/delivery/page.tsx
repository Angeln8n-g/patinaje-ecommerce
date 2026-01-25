"use client";

import { useEffect, useState, useRef } from "react";
import { getDeliveryShipments, updateDeliveryLocation } from "@/lib/skating-store/delivery-actions";
import { ShipmentCard } from "@/components/delivery/ShipmentCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeliveryDashboard() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderPopupOpen, setNewOrderPopupOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState<any>(null);
  const previousShipmentsLength = useRef(0);
  const supabase = createClient();

  const loadShipments = async (isUpdate = false) => {
    try {
      const data = await getDeliveryShipments();
      
      // Check for new assignments if it's an update or initial load
      if (data && data.length > previousShipmentsLength.current) {
        // Find the new shipment(s)
        const newShipment = data[0]; // Simplified: just grab top one for now or logic to diff
        if (newShipment && newShipment.status === 'ASIGNADO') {
           setNewOrderData(newShipment);
           setNewOrderPopupOpen(true);
           // Play sound if possible
           try {
             const audio = new Audio('/notification.mp3'); // Placeholder
             audio.play().catch(() => {});
           } catch (e) {}
        }
      }
      
      setShipments(data || []);
      previousShipmentsLength.current = data ? data.length : 0;
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar envíos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();

    // Setup realtime subscription for new assignments
    const channel = supabase
      .channel('delivery-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          // If insert or update where delivery_man_id matches current user (handled by getDeliveryShipments filtering effectively)
          // Just reload for now
          loadShipments(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Location tracking effect
  useEffect(() => {
    // Only track if there are active shipments
    const activeShipments = shipments.filter(s => s.status === 'EN_RUTA' || s.status === 'CERCA');
    
    if (activeShipments.length === 0) return;

    const intervalId = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Update location for all active shipments (or ideally just update the delivery man's location in a separate table, 
            // but for this schema we update the shipments)
            // To avoid spamming, we could pick the first active one or update all.
            // Let's update the first one for simplicity or iterate.
            for (const shipment of activeShipments) {
               await updateDeliveryLocation(shipment.id, latitude, longitude);
            }
          },
          (error) => {
            console.warn("Location tracking error:", error);
          },
          { enableHighAccuracy: true }
        );
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(intervalId);
  }, [shipments]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mis Envíos</h2>
        <span className="text-sm text-muted-foreground">{shipments.length} activos</span>
      </div>

      {shipments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground bg-card rounded-lg border">
          <p>No tienes envíos asignados en este momento.</p>
        </div>
      ) : (
        <div>
          {shipments.map((shipment) => (
            <ShipmentCard 
              key={shipment.id} 
              shipment={shipment} 
              onUpdate={() => loadShipments(false)}
            />
          ))}
        </div>
      )}

      <Dialog open={newOrderPopupOpen} onOpenChange={setNewOrderPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Nuevo Pedido Asignado!</DialogTitle>
            <DialogDescription>
              Tienes un nuevo pedido listo para entregar.
            </DialogDescription>
          </DialogHeader>
          {newOrderData && (
             <div className="py-4">
                <p className="font-bold text-lg">Pedido #{newOrderData.order?.id?.slice(0, 8)}</p>
                <p>{newOrderData.order?.shipping?.address}</p>
                <p>{newOrderData.order?.shipping?.city}</p>
             </div>
          )}
          <Button onClick={() => setNewOrderPopupOpen(false)}>Entendido</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
