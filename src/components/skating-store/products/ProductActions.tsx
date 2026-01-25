"use client";

import { useState } from "react";
import { Product } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart } from "lucide-react";

export function ProductActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useSkatingCart();

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`${quantity}x ${product.name} agregado al carrito`);
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center border rounded-md">
          <Button variant="ghost" size="icon" onClick={decrement} disabled={quantity <= 1}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="w-12 text-center font-medium">{quantity}</div>
          <Button variant="ghost" size="icon" onClick={increment}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{product.stock} disponibles</span>
      </div>
      <Button size="lg" className="w-full" onClick={handleAddToCart}>
        <ShoppingCart className="mr-2 h-5 w-5" />
        Agregar al Carrito
      </Button>
    </div>
  );
}
