"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrderById } from "@/lib/skating-store/supabase-queries";
import { Order } from "@/types/skating-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle2, MapPin, Banknote, QrCode, Clock, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { DeliveryRatingDialog } from "@/components/skating-store/rating/DeliveryRatingDialog";
import { getOrderRating } from "@/lib/skating-store/rating-actions";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  { id: 'pending', label: 'Pendiente', icon: Clock },
  { id: 'confirmed', label: 'Confirmado', icon: CheckCircle2 },
  { id: 'shipped', label: 'En camino', icon: Truck },
  { id: 'delivered', label: 'Entregado', icon: Package },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getOrderById(id);
      setOrder(prev => {
        // Show toast when status changes
        if (prev && data && prev.status !== data.status) {
          const step = STEPS.find(s => s.id === data.status);
          if (step) {
            toast.success(`Estado actualizado: ${step.label}`, {
              icon: "🔔",
            });
          }
        }
        return data;
      });

      if (data && data.status === 'delivered') {
        const rating = await getOrderRating(id);
        if (rating) setHasRated(true);
      }
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const loadInitial = async () => {
      await fetchOrder();
      setLoading(false);
    };
    loadInitial();

    // Subscribe to realtime changes on the order
    const supabase = createClient();

    const orderChannel = supabase
      .channel(`tracking-order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'skating_orders',
          filter: `id=eq.${id}`
        },
        () => {
          // Re-fetch order when it changes
          fetchOrder();
        }
      )
      .subscribe();

    // Subscribe to shipment changes for this order
    const shipmentChannel = supabase
      .channel(`tracking-shipment-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `order_id=eq.${id}`
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    // Subscribe to notifications for this order (triggers UI refresh)
    const notifChannel = supabase
      .channel(`tracking-notif-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'skating_notifications',
          filter: `order_id=eq.${id}`
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(shipmentChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [id, fetchOrder]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">No se encontró el pedido</h2>
        <p className="text-muted-foreground mb-8">El número de seguimiento no es válido o el pedido no existe.</p>
        <Link href="/skating-store">
          <Button>Volver a la tienda</Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === order.status);
  const isCashPayment = order.payment_method === 'cash';
  const isPaid = order.payment_status === 'paid';
  const showQr = (isCashPayment || order.payment_method === 'card') && !isPaid && order.status !== 'delivered';

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      {order && order.status === 'delivered' && !hasRated && (
        <DeliveryRatingDialog
          orderId={order.id}
          isOpen={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          onRatingSubmitted={() => setHasRated(true)}
        />
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Seguimiento de Pedido
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">ID: #{order.id.slice(0, 8)}</p>
              <Badge className={cn("uppercase",
                order.status === 'delivered' ? "bg-emerald-500 hover:bg-emerald-600" :
                "bg-primary text-primary-foreground"
              )}>
                {STEPS.find(s => s.id === order.status)?.label || order.status}
              </Badge>

              {order.status === 'delivered' && (
                <Button
                  size="sm"
                  variant={hasRated ? "outline" : "default"}
                  className="ml-auto"
                  onClick={() => hasRated ? toast.info("Ya has valorado este pedido") : setShowRatingDialog(true)}
                  disabled={hasRated}
                >
                  <Star className="w-4 h-4 mr-2" />
                  {hasRated ? "Valorado" : "Valorar Entrega"}
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-12 pb-8">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000 ease-in-out"
              style={{ width: `${(Math.max(0, currentStepIndex) / (STEPS.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.id} className="flex flex-col items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500",
                      isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground",
                      isCurrent && "ring-4 ring-primary/20 scale-110"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-xs font-bold whitespace-nowrap transition-colors duration-500",
                      isCompleted ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment QR Section */}
            {showQr && (
              <Card className="border-2 border-primary/20 shadow-lg md:col-span-2 overflow-hidden bg-muted/5">
                <CardHeader className="bg-primary/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <QrCode className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Validación de Entrega</CardTitle>
                      <CardDescription>Muestra este código al repartidor para confirmar la recepción</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-8 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-inner border">
                    <QRCodeSVG
                      value={JSON.stringify({ orderId: order.id, qrToken: order.qr_token })}
                      size={220}
                      level="H"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl">
                      <Banknote className="h-6 w-6" />
                      <span>
                        {order.payment_method === 'cash' ? `Total a pagar: ${formatCurrency(order.total)}` : 'Pedido Pagado (Solo Confirmar)'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Este código es único para tu pedido. Una vez escaneado, el estado se actualizará a &quot;Entregado&quot;.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Info */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  Dirección de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-bold">{order.shipping.fullName}</p>
                <p className="text-muted-foreground">{order.shipping.address}</p>
                <p className="text-muted-foreground">{order.shipping.city}, {order.shipping.postalCode}</p>
                <div className="flex items-center gap-2 pt-2 text-sm text-primary font-medium">
                  <Phone className="h-4 w-4" />
                  {order.shipping.phone}
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-bold text-foreground">{item.quantity}x</span> {item.product.name}
                      </span>
                      <span className="font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="pt-2">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-medium">
                      Método: {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-8">
            <Link href="/skating-store">
              <Button variant="ghost">Volver a la tienda</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
