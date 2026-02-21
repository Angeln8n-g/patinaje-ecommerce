"use client";

import { useEffect, useState } from "react";
import { getDeliveryHistory } from "@/lib/skating-store/delivery-actions";
import { ShipmentCard } from "@/components/delivery/ShipmentCard";
import { Loader2, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const delivered = history.filter((s) => s.status === "ENTREGADO");
  const cancelled = history.filter((s) => s.status === "CANCELADO");

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
          <p className="text-sm text-muted-foreground">
            {delivered.length} entregados · {cancelled.length} cancelados
          </p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Todos ({history.length})</TabsTrigger>
          <TabsTrigger value="delivered" className="flex-1 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Entregados ({delivered.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Cancelados ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <HistoryList items={history} emptyMessage="Aún no tienes entregas ni cancelaciones en tu historial." />
        </TabsContent>
        <TabsContent value="delivered" className="mt-4">
          <HistoryList items={delivered} emptyMessage="Aún no tienes entregas completadas." />
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4">
          <HistoryList items={cancelled} emptyMessage="No tienes pedidos cancelados." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryList({ items, emptyMessage }: { items: any[]; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground bg-card rounded-xl border border-dashed">
        <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((shipment) => (
        <ShipmentCard
          key={shipment.id}
          shipment={shipment}
          onUpdate={() => {}}
        />
      ))}
    </div>
  );
}
