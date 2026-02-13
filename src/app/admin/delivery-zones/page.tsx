"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Both components use Leaflet (browser-only APIs), so we disable SSR
const StoreLocationConfig = dynamic(
  () => import("@/components/admin/StoreLocationConfig"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

const DeliveryZoneEditor = dynamic(
  () => import("@/components/admin/DeliveryZoneEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

const DeliveryPricingConfig = dynamic(
  () => import("@/components/admin/DeliveryPricingConfig"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

export default function DeliveryZonesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Zonas de Entrega</h1>
        <p className="text-muted-foreground">
          Configura la ubicación de la tienda, define las zonas geográficas de
          cobertura para envíos, y configura la tarificación basada en distancia.
        </p>
      </div>

      <StoreLocationConfig />
      <DeliveryZoneEditor />
      <DeliveryPricingConfig />
    </div>
  );
}
