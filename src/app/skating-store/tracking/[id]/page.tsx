"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrderById } from "@/lib/skating-store/supabase-queries";
import { Order } from "@/types/skating-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle2, MapPin, Banknote, QrCode, Clock, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: 'pending', label: 'Pendiente', icon: Clock },
  { id: 'confirmed', label: 'Confirmado', icon: CheckCircle2 },
  { id: 'shipped', label: 'En camino', icon: Truck },
  { id: 'delivered', label: 'Entregado', icon: Package },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const loadOrder = async () => {
        try {
          const data = await getOrderById(id as string);
          setOrder(data);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      loadOrder();
      
      // Podríamos añadir una suscripción en tiempo real aquí si fuera necesario
    }
  }, [id]);

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

  return (
    <div className="container max-w-3xl py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seguimiento de Pedido</h1>
          <p className="text-muted-foreground">ID: #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Badge variant={order.status === 'delivered' ? 'outline' : 'default'} className="w-fit text-sm px-4 py-1">
          {STEPS[currentStepIndex]?.label || order.status.toUpperCase()}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="relative pt-12 pb-8">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000" 
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
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
                  "text-xs font-bold whitespace-nowrap",
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
        {isCashPayment && !isPaid && (
          <Card className="border-2 border-primary/20 shadow-lg md:col-span-2 overflow-hidden bg-muted/5">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Validación de Pago</CardTitle>
                  <CardDescription>Muestra este código al repartidor para pagar en efectivo</CardDescription>
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
                  <span>Total a pagar: ${order.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Este código es único para tu pedido. Una vez escaneado, el estado se actualizará automáticamente a "Entregado".
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
                  <span className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${order.total.toFixed(2)}</span>
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
  );
}
