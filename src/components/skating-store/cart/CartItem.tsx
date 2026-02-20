"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { Minus, Plus, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getColorHex } from "@/lib/skating-store/color-utils";

interface CartItemProps {
  item: CartItemType;
  editable?: boolean;
}

export function CartItem({ item, editable = true }: CartItemProps) {
  const { updateQuantity } = useSkatingCart();
  const { product, quantity } = item;
  const colorHex = product.variant_type === 'color' && item.selectedVariant && product.variant_options
    ? getColorHex(product.variant_options, item.selectedVariant)
    : null;

  return (
    <div className="flex gap-4 py-6 items-center">
      {/* Checkbox (Visual - Lime Green) */}
      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
        <Check className="h-4 w-4" />
      </div>

      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[20px] bg-secondary p-3">
        <Image
          src={product.images[0] || "https://placehold.co/600x600/png?text=Skate"}
          alt={product.name}
          fill
          className="object-contain"
          sizes="96px"
        />
      </div>
      
      <div className="flex flex-1 items-center justify-between">
        <div className="space-y-2">
          <h3 className="font-semibold text-base line-clamp-2 max-w-[240px] leading-tight">{product.name}</h3>
          {item.selectedVariant && (
            <div className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {colorHex && (
                <span
                  className="inline-block h-3 w-3 rounded-full shrink-0 border border-border/50"
                  style={{ backgroundColor: colorHex }}
                />
              )}
              {product.variant_type === 'color' ? 'Color' : product.variant_type === 'size' ? 'Talla' : 'Medida'}: {item.selectedVariant}
            </div>
          )}
          <p className="font-extrabold text-xl">{formatCurrency(
            item.selectedVariant && product.variant_prices && product.variant_prices[item.selectedVariant] != null
              ? product.variant_prices[item.selectedVariant]
              : product.price
          )}</p>
        </div>
        
        {editable && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-secondary rounded-full h-10 px-1 border border-border/50">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground" 
                onClick={() => updateQuantity(product.id, quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="w-8 text-center text-sm font-medium">{quantity}</div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground" 
                onClick={() => updateQuantity(product.id, quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
