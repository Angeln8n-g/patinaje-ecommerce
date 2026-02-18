"use client";

import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "../cart/CartItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Truck, Receipt } from "lucide-react";

const ITBIS_RATE = 0.18;

interface OrderSummaryProps {
  shippingCost?: number;
  isWithinFreeZone?: boolean;
}

export function OrderSummary({ shippingCost = 0, isWithinFreeZone = false }: OrderSummaryProps) {
  const { items, total } = useSkatingCart();

  // total del carrito ya incluye los precios base de los productos
  const subtotalSinImpuesto = Math.round((total / (1 + ITBIS_RATE)) * 100) / 100;
  const itbis = Math.round((total - subtotalSinImpuesto) * 100) / 100;
  const finalTotal = total + shippingCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {items.map((item) => (
            <CartItem key={item.product.id} item={item} editable={false} />
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal (sin ITBIS)</span>
            <span>{formatCurrency(subtotalSinImpuesto)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" />
              ITBIS (18%)
            </span>
            <span>{formatCurrency(itbis)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              Envío
            </span>
            <span>
              {isWithinFreeZone ? (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  Gratis
                </Badge>
              ) : shippingCost > 0 ? (
                formatCurrency(shippingCost)
              ) : (
                "Por calcular"
              )}
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total a Pagar</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">* Los precios incluyen ITBIS</p>
        </div>
      </CardContent>
    </Card>
  );
}
