"use client";

import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "../cart/CartItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function OrderSummary() {
  const { items, total } = useSkatingCart();

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
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Total a Pagar</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
