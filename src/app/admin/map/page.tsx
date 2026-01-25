"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getAllOrdersWithShipment } from '@/lib/skating-store/delivery-actions';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// Dynamic import for map to avoid SSR issues
const DeliveryMap = dynamic(() => import('@/components/admin/DeliveryMap').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-muted">Cargando mapa...</div>
});

export default function AdminMapPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadData = async () => {
    const orders = await getAllOrdersWithShipment();
    if (!orders) {
      setShipments([]);
      setIsLoading(false);
      return;
    }

    // Now getAllOrdersWithShipment returns shipments as object or null
    const activeShipments = orders
      .filter((o: any) => o.shipment)
      .map((o: any) => ({
        ...o.shipment, 
        order: o
      }));
      
    setShipments(activeShipments);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Realtime updates
    const channel = supabase
      .channel('admin-map-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mapa de Envíos en Tiempo Real</h1>
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DeliveryMap shipments={shipments} />
      )}
    </div>
  );
}
