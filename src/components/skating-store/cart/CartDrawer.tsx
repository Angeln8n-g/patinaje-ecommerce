"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { CartItem } from "./CartItem";
import Link from "next/link";

export function CartDrawer() {
  const { items, total, itemCount } = useSkatingCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpenCart = () => setOpen(true);
    window.addEventListener('open-cart', handleOpenCart);
    return () => window.removeEventListener('open-cart', handleOpenCart);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tu Carrito ({itemCount})</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
              <SheetClose asChild>
                <Button variant="outline">Continuar comprando</Button>
              </SheetClose>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <SheetClose asChild>
              <Link href="/skating-store/checkout" className="w-full">
                <Button className="w-full" size="lg">Proceder al Pago</Button>
              </Link>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
