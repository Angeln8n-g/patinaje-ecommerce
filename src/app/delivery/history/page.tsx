"use client";

import { useEffect, useState } from "react";
import { getDeliveryHistory } from "@/lib/skating-store/delivery-actions";
import { ShipmentCard } from "@/components/delivery/ShipmentCard";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getDeliveryHistory();
        setHistory(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar historial");
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <HistoryIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Historial de Envíos</h2>
          <p className="text-sm text-muted-foreground">{history.length} entregas completadas</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-dashed">
          <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Aún no tienes entregas registradas en tu historial.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((shipment) => (
            <ShipmentCard 
              key={shipment.id} 
              shipment={shipment} 
              onUpdate={() => {}} // No update needed for history
            />
          ))}
        </div>
      )}
    </div>
  );
}
