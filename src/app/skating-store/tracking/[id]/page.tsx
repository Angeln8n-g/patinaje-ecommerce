"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getOrderById } from "@/lib/skating-store/supabase-queries";
import { getStoreLocation } from "@/lib/skating-store/zone-actions";
import { Order, StoreLocation } from "@/types/skating-store";
import { haversineDistance, calculateEstimatedTime, formatEstimatedTime } from "@/lib/skating-store/geo-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle2, MapPin, Banknote, QrCode, Clock, Phone, Star, Timer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { DeliveryRatingDialog } from "@/components/skating-store/rating/DeliveryRatingDialog";
import { getOrderRating } from "@/lib/skating-store/rating-actions";
import { authFetch } from "@/lib/api/client";

const STEPS = [
  { id: "pending", label: "Pendiente", icon: Clock },
  { id: "confirmed", label: "Confirmado", icon: CheckCircle2 },
  { id: "shipped", label: "En camino", icon: Truck },
  { id: "delivered", label: "Entregado", icon: Package },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [storeLocation, setStoreLocation] = useState<StoreLocation | null>(null);
  const [shipmentStatus, setShipmentStatus] = useState<string | null>(null);
  const [deliveryManId, setDeliveryManId] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getOrderById(id);
      setOrder((prev) => {
        if (prev && data && prev.status !== data.status) {
          const step = STEPS.find((s) => s.id === data.status);
          if (step) toast.success(`Estado actualizado: ${step.label}`, { icon: "🔔" });
        }
        return data;
      });
      if (data?.status === "delivered") {
        const rating = await getOrderRating(id);
        if (rating) setHasRated(true);
      }
    } catch {}
  }, [id]);

  const fetchShipmentInfo = useCallback(async () => {
    if (!id) return;
    try {
      const shipment = await authFetch(`/api/delivery/shipments/by-order/${id}`);
      if (shipment) {
        setShipmentStatus(shipment.status);
        setDeliveryManId(shipment.delivery_man_id);
      }
    } catch {}
  }, [id]);

  useEffect(() => { getStoreLocation().then((loc) => { if (loc) setStoreLocation(loc); }); }, []);

  // Calculate ETA
  const calculateETA = useCallback(async () => {
    if (!order || !deliveryManId || !storeLocation) { setEtaText(null); return; }
    if (shipmentStatus === "ENTREGADO" || order.status === "delivered") { setEtaText(null); return; }

    // Try to get delivery location
    let distanceKm: number | null = null;
    const custLat = order.shipping?.lat;
    const custLng = order.shipping?.lng;
    if (!custLat || !custLng) { setEtaText(null); return; }

    if (shipmentStatus === "EN_RUTA" || shipmentStatus === "CERCA") {
      try {
        const locations = await authFetch("/api/delivery/locations");
        const loc = locations?.find((l: any) => l.delivery_man_id === deliveryManId);
        if (loc) distanceKm = haversineDistance(Number(loc.lat), Number(loc.lng), custLat, custLng);
      } catch {}
    }
    if (distanceKm == null && storeLocation) {
      distanceKm = haversineDistance(storeLocation.lat, storeLocation.lng, custLat, custLng);
    }
    if (distanceKm != null) {
      const eta = calculateEstimatedTime(distanceKm);
      setEtaText(formatEstimatedTime(eta));
    }
  }, [order, deliveryManId, shipmentStatus, storeLocation]);

  useEffect(() => { calculateETA(); }, [calculateETA]);

  useEffect(() => {
    if (!id) return;
    const loadInitial = async () => {
      await Promise.all([fetchOrder(), fetchShipmentInfo()]);
      setLoading(false);
    };
    loadInitial();
    // Poll every 10 seconds for updates (replaces Supabase realtime)
    const interval = setInterval(() => { fetchOrder(); fetchShipmentInfo(); calculateETA(); }, 10000);
    return () => clearInterval(interval);
  }, [id, fetchOrder, fetchShipmentInfo, calculateETA]);

  if (loading) return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!order) return (
    <div className="container py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">No se encontró el pedido</h2>
      <p className="text-muted-foreground mb-8">El número de seguimiento no es válido o el pedido no existe.</p>
      <Link href="/skating-store"><Button>Volver a la tienda</Button></Link>
    </div>
  );

  const currentStepIndex = STEPS.findIndex((s) => s.id === order.status);
  const isCancelled = order.status === "cancelled";
  const showQr = !isCancelled && (order.payment_method === "cash" || order.payment_method === "card") && order.payment_status !== "paid" && order.status !== "delivered";
  const showNoDeliveryMsg = !isCancelled && !deliveryManId && order.status !== "delivered" && order.status !== "pending";
  const showEta = !isCancelled && !!etaText && !!deliveryManId && shipmentStatus !== "ENTREGADO" && order.status !== "delivered";

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {order.status === "delivered" && !hasRated && (
        <DeliveryRatingDialog orderId={order.id} isOpen={showRatingDialog} onOpenChange={setShowRatingDialog} onRatingSubmitted={() => setHasRated(true)} />
      )}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Seguimiento de Pedido</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">ID: #{order.id.slice(0, 8)}</p>
              <Badge className={cn("uppercase", order.status === "delivered" ? "bg-emerald-500 hover:bg-emerald-600" : isCancelled ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground")}>
                {isCancelled ? "Cancelado" : (STEPS.find((s) => s.id === order.status)?.label || order.status)}
              </Badge>
              {order.status === "delivered" && (
                <Button size="sm" variant={hasRated ? "outline" : "default"} className="ml-auto" onClick={() => hasRated ? toast.info("Ya has valorado este pedido") : setShowRatingDialog(true)} disabled={hasRated}>
                  <Star className="w-4 h-4 mr-2" />{hasRated ? "Valorado" : "Valorar Entrega"}
                </Button>
              )}
            </div>
          </div>
          {isCancelled && (
            <Card className="border-2 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800 shadow-sm">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg text-red-600 dark:text-red-400"><XCircle className="h-5 w-5" /></div>
                <p className="font-semibold text-red-700 dark:text-red-300">Este pedido fue cancelado por retraso en la entrega.</p>
              </CardContent>
            </Card>
          )}
          {!isCancelled && showEta && (
            <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 shadow-sm">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400"><Timer className="h-5 w-5" /></div>
                <p className="font-semibold text-blue-700 dark:text-blue-300 text-lg">{etaText}</p>
              </CardContent>
            </Card>
          )}
          {showNoDeliveryMsg && (
            <Card className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 shadow-sm">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg text-amber-600 dark:text-amber-400"><Timer className="h-5 w-5" /></div>
                <p className="font-medium text-amber-700 dark:text-amber-300">El tiempo estimado estará disponible una vez se asigne un repartidor</p>
              </CardContent>
            </Card>
          )}
          {!isCancelled && (
          <div className="relative pt-12 pb-8">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full" />
            <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${(Math.max(0, currentStepIndex) / (STEPS.length - 1)) * 100}%` }} />
            <div className="relative flex justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.id} className="flex flex-col items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500", isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground", isCurrent && "ring-4 ring-primary/20 scale-110")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn("text-xs font-bold whitespace-nowrap transition-colors duration-500", isCompleted ? "text-primary" : "text-muted-foreground")}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showQr && (
              <Card className="border-2 border-primary/20 shadow-lg md:col-span-2 overflow-hidden bg-muted/5">
                <CardHeader className="bg-primary/5 pb-4">
                  <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg text-primary"><QrCode className="h-6 w-6" /></div><div><CardTitle>Validación de Entrega</CardTitle><CardDescription>Muestra este código al repartidor para confirmar la recepción</CardDescription></div></div>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-8 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-inner border"><QRCodeSVG value={JSON.stringify({ orderId: order.id, qrToken: order.qr_token })} size={220} level="H" /></div>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl"><Banknote className="h-6 w-6" /><span>{order.payment_method === "cash" ? `Total a pagar: ${formatCurrency(order.total)}` : "Pedido Pagado (Solo Confirmar)"}</span></div>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Este código es único para tu pedido.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" />Dirección de Entrega</CardTitle></CardHeader>
              <CardContent className="space-y-1"><p className="font-bold">{order.shipping.fullName}</p><p className="text-muted-foreground">{order.shipping.address}</p><p className="text-muted-foreground">{order.shipping.city}, {order.shipping.postalCode}</p><div className="flex items-center gap-2 pt-2 text-sm text-primary font-medium"><Phone className="h-4 w-4" />{order.shipping.phone}</div></CardContent>
            </Card>
            <Card className="shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-muted-foreground" />Resumen del Pedido</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">
                {order.items.map((item, idx) => (<div key={idx} className="flex justify-between text-sm"><span className="text-muted-foreground"><span className="font-bold text-foreground">{item.quantity}x</span> {item.product.name}</span><span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span></div>))}
                <div className="pt-3 border-t flex justify-between items-center font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
                <div className="pt-2"><Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-medium">Método: {order.payment_method === "cash" ? "Efectivo" : "Tarjeta"}</Badge></div>
              </div></CardContent>
            </Card>
          </div>
          <div className="flex justify-center pt-8"><Link href="/skating-store"><Button variant="ghost">Volver a la tienda</Button></Link></div>
        </div>
      </div>
    </div>
  );
}
