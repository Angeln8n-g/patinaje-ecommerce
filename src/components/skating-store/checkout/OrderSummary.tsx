"use client";

import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "../cart/CartItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryProps {
  shippingCost?: number;
}

export function OrderSummary({ shippingCost = 0 }: OrderSummaryProps) {
  const { items, total } = useSkatingCart();
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
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span>{shippingCost > 0 ? formatCurrency(shippingCost) : "Por calcular"}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total a Pagar</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
