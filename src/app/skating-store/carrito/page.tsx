"use client";

import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "@/components/skating-store/cart/CartItem";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const { items, total, itemCount, clearCart } = useSkatingCart();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Tu carrito está vacío</h1>
        <Link href="/skating-store/catalogo">
          <Button>Ir al Catálogo</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Carrito de Compras ({itemCount})</h1>
      
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="divide-y">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
            <div className="pt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive">
                Vaciar Carrito
              </Button>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-1">
          <div className="bg-card rounded-lg border p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Envío</span>
                <span>Gratis</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <Link href="/skating-store/checkout" className="w-full block">
              <Button className="w-full" size="lg">Proceder al Pago</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
