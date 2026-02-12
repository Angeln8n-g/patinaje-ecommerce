"use client";

import { useEffect, useState, useRef } from "react";
import { getDeliveryShipments, updateDeliveryLocation, updateDeliveryManLocation } from "@/lib/skating-store/delivery-actions";
import { ShipmentCard } from "@/components/delivery/ShipmentCard";
import { Loader2, Package, Truck, MapPinOff } from "lucide-react";
import { toast } from "sonner";
import { mapDbOrderToOrder } from "@/lib/skating-store/supabase-queries";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DeliveryDashboard() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderPopupOpen, setNewOrderPopupOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState<any>(null);
  const [geolocationDenied, setGeolocationDenied] = useState(false);
  const previousShipmentsLength = useRef(0);

  const loadShipments = async (isUpdate = false) => {
    try {
      const data = await getDeliveryShipments();
      if (data && data.length > previousShipmentsLength.current && isUpdate) {
        const newShipment = data[0];
        if (newShipment?.status === "ASIGNADO") {
          setNewOrderData(newShipment);
          setNewOrderPopupOpen(true);
        }
      }
      setShipments(data || []);
      previousShipmentsLength.current = data ? data.length : 0;
    } catch { toast.error("Error al cargar envíos"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    loadShipments();
    // Poll every 15 seconds for new assignments (replaces Supabase realtime)
    const interval = setInterval(() => loadShipments(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // GPS tracking: send location every 15 seconds
  useEffect(() => {
    if (!navigator.geolocation) { setGeolocationDenied(true); return; }
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setGeolocationDenied(result.state === "denied");
        result.addEventListener("change", () => setGeolocationDenied(result.state === "denied"));
      }).catch(() => {});
    }
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => { setGeolocationDenied(false); try { await updateDeliveryManLocation(pos.coords.latitude, pos.coords.longitude); } catch {} },
        (err) => { if (err.code === err.PERMISSION_DENIED) setGeolocationDenied(true); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    sendLocation();
    const intervalId = setInterval(sendLocation, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // Shipment location tracking
  useEffect(() => {
    const active = shipments.filter((s) => s.status === "EN_RUTA" || s.status === "CERCA");
    if (active.length === 0) return;
    const intervalId = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          for (const s of active) { try { await updateDeliveryLocation(s.id, pos.coords.latitude, pos.coords.longitude); } catch {} }
        }, () => {}, { enableHighAccuracy: true });
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [shipments]);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-8">
      {geolocationDenied && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <MapPinOff className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Rastreo de ubicación no disponible</p>
            <p className="text-xs mt-1 opacity-80">Los permisos de geolocalización están denegados. Habilita los permisos de ubicación en la configuración de tu navegador.</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Truck className="h-5 w-5" /></div>
          <h2 className="text-2xl font-bold tracking-tight">Mis Envíos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {shipments.length === 0 ? "No tienes entregas pendientes" : `Tienes ${shipments.length} ${shipments.length === 1 ? "entrega pendiente" : "entregas pendientes"}`}
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
          {shipments.map((shipment) => (<ShipmentCard key={shipment.id} shipment={shipment} onUpdate={() => loadShipments(false)} />))}
        </div>
      )}
      <Dialog open={newOrderPopupOpen} onOpenChange={setNewOrderPopupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>¡Nuevo Pedido Asignado!</DialogTitle><DialogDescription>Tienes un nuevo pedido listo para entregar.</DialogDescription></DialogHeader>
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
