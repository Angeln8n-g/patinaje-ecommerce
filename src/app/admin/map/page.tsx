"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getAllOrdersWithShipment } from "@/lib/skating-store/delivery-actions";
import { Loader2 } from "lucide-react";

const DeliveryMap = dynamic(() => import("@/components/admin/DeliveryMap").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-muted">Cargando mapa...</div>,
});

export default function AdminMapPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const orders = await getAllOrdersWithShipment();
    const activeShipments = (orders || []).filter((o: any) => o.shipment).map((o: any) => ({ ...o.shipment, order: o }));
    setShipments(activeShipments);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // Poll every 15 seconds (replaces Supabase realtime)
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mapa de Envíos en Tiempo Real</h1>
      {isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div> : <DeliveryMap shipments={shipments} />}
    </div>
  );
}
