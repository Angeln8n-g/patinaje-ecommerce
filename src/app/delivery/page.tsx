"use client";

import { useEffect, useState, useRef } from "react";
import { getDeliveryShipments, updateDeliveryLocation } from "@/lib/skating-store/delivery-actions";
import { ShipmentCard } from "@/components/delivery/ShipmentCard";
import { Loader2, Package, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mapDbOrderToOrder } from "@/lib/skating-store/supabase-queries";
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
               try {
                 await updateDeliveryLocation(shipment.id, latitude, longitude);
               } catch {
                 // Individual shipment update failed — continue with others
               }
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
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Mis Envíos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {shipments.length === 0 
            ? "No tienes entregas pendientes" 
            : `Tienes ${shipments.length} ${shipments.length === 1 ? 'entrega pendiente' : 'entregas pendientes'}`}
        </p>
      </div>

      {shipments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-dashed shadow-sm">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">¡Buen trabajo! Estás al día con tus repartos.</p>
          <p className="text-xs mt-1">Los nuevos pedidos aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
                {(() => {
                  const order = newOrderData.order?.shipping ? newOrderData.order : mapDbOrderToOrder(newOrderData.order);
                  return (
                    <>
                      <p>{order?.shipping?.address}</p>
                      <p>{order?.shipping?.city}</p>
                    </>
                  );
                })()}
             </div>
          )}
          <Button onClick={() => setNewOrderPopupOpen(false)}>Entendido</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
