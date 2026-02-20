"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";
import { Order } from "@/types/skating-store";
import { getColorHex } from "@/lib/skating-store/color-utils";

interface POSReceiptProps {
  order: Order;
  sellerName: string;
  change?: number;
  onClose: () => void;
}

export function POSReceipt({ order, sellerName, change, onClose }: POSReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4 print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle className="text-base">Recibo de Venta</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="font-bold text-lg">Skating Store</h2>
            <p className="text-xs text-muted-foreground">
              Pedido #{order.id.slice(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>{item.quantity}x </span>
                  <span>{item.product.name}</span>
                  {item.product.variant_type === 'color' && item.selectedVariant ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 ml-1">
                      {(() => { const hex = item.product.variant_options ? getColorHex(item.product.variant_options, item.selectedVariant) : null; return hex ? <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: hex }} /> : null; })()}
                      <span>Color: {item.selectedVariant}</span>
                    </span>
                  ) : item.selectedVariant ? (
                    <span className="text-muted-foreground"> ({item.selectedVariant})</span>
                  ) : null}
                </div>
                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Método de pago</span>
              <span>{order.payment_method === "cash" ? "Efectivo" : "Tarjeta"}</span>
            </div>
            {change !== undefined && change > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Cambio</span>
                <span>${change.toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Atendido por: {sellerName}</p>
            <p>¡Gracias por su compra!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
