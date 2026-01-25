"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { Minus, Plus, Trash2 } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  editable?: boolean;
}

export function CartItem({ item, editable = true }: CartItemProps) {
  const { updateQuantity, removeItem } = useSkatingCart();
  const { product, quantity } = item;

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        <Image
          src={product.images[0] || "https://placehold.co/600x600/png?text=Skate"}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{product.category.replace('-', ' ')}</p>
          </div>
          <p className="font-medium">${(product.price * quantity).toFixed(2)}</p>
        </div>
        
        {editable && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center border rounded-md h-8">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => updateQuantity(product.id, quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="w-8 text-center text-sm">{quantity}</div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => updateQuantity(product.id, quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive/90"
              onClick={() => removeItem(product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!editable && (
           <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
        )}
      </div>
    </div>
  );
}
