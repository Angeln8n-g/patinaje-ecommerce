"use client";

import dynamic from "next/dynamic";
import { Shipment, ShipmentStatus } from "@/types/skating-store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Package, Navigation, QrCode, Banknote, CheckCircle2, FileText, XCircle } from "lucide-react";
import { updateShipmentStatus } from "@/lib/skating-store/delivery-actions";
import { confirmCashPayment } from "@/lib/skating-store/supabase-queries";
import { generateAndSendInvoice } from "@/lib/skating-store/invoice-actions";
import { cancelDeliveryOrder } from "@/lib/skating-store/order-cancellation-actions";
import { CancelOrderModal } from "@/components/shared/CancelOrderModal";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { cn } from "@/lib/utils";
import { mapDbOrderToOrder } from "@/lib/skating-store/supabase-queries";
import { createInAppNotification } from "@/lib/skating-store/in-app-notifications";

const DeliveryPointMap = dynamic(() => import("@/components/delivery/DeliveryPointMap"), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full flex items-center justify-center bg-muted rounded-xl border text-xs text-muted-foreground">Cargando mapa...</div>,
});

interface ShipmentCardProps {
  shipment: any; // Using any for now to handle joined data easily
  onUpdate: () => void;
}

export function ShipmentCard({ shipment, onUpdate }: ShipmentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Robust data handling
  const rawOrder = shipment.order;
  if (!rawOrder) return null; // Or some fallback UI

  // Ensure order is mapped correctly even if it comes from different sources
  const order = rawOrder.shipping ? rawOrder : mapDbOrderToOrder(rawOrder);
  const shipping = order.shipping;

  if (!shipping) {
    console.error("Shipping info missing for order:", order.id);
    return null;
  }

  const handleStatusUpdate = async (newStatus: ShipmentStatus) => {
    setIsLoading(true);
    try {
      // Get current location if possible
      let lat, lng;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (e) {
          console.warn("Could not get location for status update");
        }
      }

      await updateShipmentStatus(shipment.id, newStatus, lat, lng);
      toast.success(`Estado actualizado a ${newStatus}`);
      onUpdate();
    } catch (error) {
      toast.error("Error al actualizar estado");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQrScan = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.orderId !== order.id) {
        toast.error("El código QR no pertenece a este pedido");
        return;
      }
      
      setIsLoading(true);
      await confirmCashPayment(data.orderId, data.qrToken);
      
      // Notificar finalización de compra por pago en efectivo
      if (order.user_id) {
        await createInAppNotification({
          user_id: order.user_id,
          order_id: order.id,
          title: "¡Pago Confirmado!",
          message: `Hemos recibido tu pago en efectivo de ${formatCurrency(order.total)}. ¡Gracias!`,
          type: 'success'
        });
      }

      // Send final invoice after cash payment confirmation
      const customerEmail = shipping?.email || order.customer_email;
      if (customerEmail) {
        try {
          await generateAndSendInvoice({
            orderId: order.id,
            customerEmail,
            customerName: shipping.fullName,
            address: shipping.address,
            city: shipping.city,
            phone: shipping.phone,
            items: order.items || [],
            subtotal: order.total,
            shippingCost: 0,
            total: order.total,
            paymentMethod: "cash",
            fiscalData: order.fiscal_data || null,
          });
        } catch (invoiceErr) {
          console.error("Error sending invoice after cash payment:", invoiceErr);
        }
      }

      toast.success("Pago confirmado y pedido entregado");
      setIsScannerOpen(false);
      onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("Código QR inválido o error al procesar el pago");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    setIsLoading(true);
    try {
      const customerEmail = shipping?.email || order.customer_email || order.user_email;
      
      if (!customerEmail) {
        toast.error("No se encontró el email del cliente");
        return;
      }

      await generateAndSendInvoice({
        orderId: order.id,
        customerEmail,
        customerName: shipping.fullName,
        address: shipping.address,
        city: shipping.city,
        phone: shipping.phone,
        items: order.items || [],
        subtotal: order.total,
        shippingCost: 0,
        total: order.total,
        paymentMethod: order.payment_method || "card",
        fiscalData: order.fiscal_data || null,
      }, { force: true });
      toast.success("Factura enviada correctamente al cliente");
    } catch (error) {
      toast.error("Error al enviar la factura");
    } finally {
      setIsLoading(false);
    }
  };

  const canCancel = shipment.status === 'ASIGNADO' || shipment.status === 'EN_RUTA';

  const handleCancelOrder = async (reasonCode: string, reasonDescription?: string) => {
    setIsCancelling(true);
    try {
      await cancelDeliveryOrder(order.id, { reasonCode, reasonDescription });
      toast.success("Pedido cancelado exitosamente");
      setIsCancelModalOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar el pedido");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case 'ASIGNADO': return 'secondary';
      case 'EN_RUTA': return 'default';
      case 'CERCA': return 'warning';
      case 'ENTREGADO': return 'outline';
      default: return 'default';
    }
  };

  const openMap = () => {
    const query = encodeURIComponent(`${shipping.address}, ${shipping.city}, ${shipping.postalCode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const isCashOrder = order.payment_method === 'cash';
  const isPendingPayment = order.payment_status === 'pending';
  const isHistory = shipment.status === 'ENTREGADO';

  return (
    <>
      <Card className={cn("mb-4 overflow-hidden border-none shadow-md transition-all hover:shadow-lg", isHistory && "opacity-80")}>
        <CardHeader className={cn("pb-2", isHistory ? "bg-muted/30" : "bg-primary/5")}>
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-bold tracking-tight">Pedido #{order.id.slice(0, 8)}</CardTitle>
              {isHistory && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ENTREGADO EL {new Date(shipment.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge variant={getStatusColor(shipment.status) as any} className="shadow-sm">{shipment.status}</Badge>
          </div>
          {isCashOrder && (
            <div className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md mt-2 w-fit uppercase tracking-wider shadow-sm",
              order.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              <Banknote className="h-3.5 w-3.5" />
              {order.payment_status === 'paid' ? 'PAGADO EN EFECTIVO' : 'COBRO EN EFECTIVO PENDIENTE'}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-sm">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Cliente</p>
                <p className="font-semibold text-base">{shipping.fullName}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Dirección de Entrega</p>
                <p className="font-medium leading-tight">{shipping.address}</p>
                <p className="text-muted-foreground text-xs">{shipping.city}, {shipping.postalCode}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-dashed">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href={`tel:${shipping.phone}`} className="font-bold text-primary hover:underline">
                {shipping.phone}
              </a>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-black text-primary text-base">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Delivery point map */}
          {!isHistory && shipping.lat && shipping.lng && (
            <DeliveryPointMap
              deliveryLat={shipping.lat}
              deliveryLng={shipping.lng}
              customerName={shipping.fullName}
              address={`${shipping.address}, ${shipping.city}`}
            />
          )}
        </CardContent>
        {!isHistory && (
          <CardFooter className="flex flex-col gap-2 pt-0 pb-4 px-6">
            <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-2 hover:bg-muted" onClick={openMap}>
              <Navigation className="mr-2 h-4 w-4" />
              Abrir en Google Maps
            </Button>
            
            {shipment.status === 'ASIGNADO' && (
              <Button className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => handleStatusUpdate('EN_RUTA')} disabled={isLoading}>
                Comenzar Entrega
              </Button>
            )}
            
            {shipment.status === 'EN_RUTA' && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="secondary" className="h-11 rounded-xl font-bold" onClick={() => handleStatusUpdate('CERCA')} disabled={isLoading}>
                  Estoy Cerca
                </Button>
                {isCashOrder && isPendingPayment ? (
                  <Button onClick={() => setIsScannerOpen(true)} className="h-11 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200">
                    <QrCode className="mr-2 h-4 w-4" />
                    Cobrar QR
                  </Button>
                ) : (
                  <Button className="h-11 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => handleStatusUpdate('ENTREGADO')} disabled={isLoading}>
                    Entregado
                  </Button>
                )}
              </div>
            )}

            {shipment.status === 'ENTREGADO' && (
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl font-bold border-primary text-primary hover:bg-primary/5" 
                onClick={handleSendInvoice}
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Enviar Factura al Cliente
              </Button>
            )}

            {shipment.status === 'CERCA' && (
              <>
                {isCashOrder && isPendingPayment ? (
                  <Button onClick={() => setIsScannerOpen(true)} className="w-full h-11 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200">
                    <QrCode className="mr-2 h-4 w-4" />
                    Confirmar Cobro con QR
                  </Button>
                ) : (
                  <Button className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => handleStatusUpdate('ENTREGADO')} disabled={isLoading}>
                    Confirmar Entrega
                  </Button>
                )}
              </>
            )}

            {canCancel && (
              <Button
                variant="ghost"
                className="w-full h-11 rounded-xl font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Pedido
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR de Cliente</DialogTitle>
            <DialogDescription>
              Escanea el código QR del cliente para confirmar la recepción del efectivo y completar el pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner onScan={handleQrScan} autoStart={true} />
          </div>
          <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-lg">Monto a Cobrar:</span>
            </div>
            <span className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</span>
          </div>
        </DialogContent>
      </Dialog>

      <CancelOrderModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        role="DELIVERY"
        onConfirm={handleCancelOrder}
        loading={isCancelling}
      />
    </>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
