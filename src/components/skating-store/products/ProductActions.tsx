"use client";

import { useState } from "react";
import { Product } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ColorPicker } from "@/components/skating-store/products/ColorPicker";
import { parseColorOptions } from "@/lib/skating-store/color-utils";

/** Get the effective price for a product given a selected variant */
export function getVariantPrice(product: Product, variant?: string): number {
  if (variant && product.variant_prices && product.variant_prices[variant] != null) {
    return product.variant_prices[variant];
  }
  return product.price;
}

export function ProductActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const { addItem } = useSkatingCart();
  const { user } = useAuth();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Debes iniciar sesión para comprar", {
        description: "Regístrate o inicia sesión para agregar productos al carrito.",
        action: {
          label: "Ir a Login",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    if (product.variant_type && product.variant_type !== 'none' && !selectedVariant) {
      const msg = product.variant_type === 'color'
        ? 'Por favor selecciona un color'
        : product.variant_type === 'size'
          ? 'Por favor selecciona una talla'
          : 'Por favor selecciona una medida';
      toast.error(msg);
      return;
    }

    addItem(product, quantity, selectedVariant);
    toast.success(`${quantity}x ${product.name} agregado al carrito`);
  };

  const showVariants = product.variant_type && product.variant_type !== 'none' && product.variant_options && product.variant_options.length > 0;
  const isColorVariant = product.variant_type === 'color';
  const colorOptions = isColorVariant && product.variant_options ? parseColorOptions(product.variant_options) : [];
  const currentPrice = getVariantPrice(product, selectedVariant || undefined);
  const hasVariantPrices = product.variant_prices && Object.keys(product.variant_prices).length > 0;

  // Compute price range for color variants when no color is selected
  const colorPriceRange = (() => {
    if (!isColorVariant || !hasVariantPrices) return null;
    const prices = Object.values(product.variant_prices!);
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return null;
    return { min, max };
  })();

  return (
    <div className="flex flex-col gap-6 w-full">
      {showVariants && isColorVariant && !selectedVariant && colorPriceRange && (
        <div className="flex items-center gap-1">
          <span className="text-4xl font-extrabold">{formatCurrency(colorPriceRange.min)}</span>
          <span className="text-2xl font-bold text-muted-foreground">-</span>
          <span className="text-4xl font-extrabold">{formatCurrency(colorPriceRange.max)}</span>
        </div>
      )}

      {showVariants && selectedVariant && hasVariantPrices && (
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold">{formatCurrency(currentPrice)}</span>
          {currentPrice !== product.price && (
            <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</span>
          )}
        </div>
      )}

      {showVariants && isColorVariant && colorOptions.length > 0 && (
        <ColorPicker
          colors={colorOptions}
          selectedColor={selectedVariant || null}
          onSelect={setSelectedVariant}
        />
      )}

      {showVariants && !isColorVariant && (
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {product.variant_type === 'size' ? 'Selecciona Talla' : 'Selecciona Medida'}
          </label>
          <div className="flex flex-wrap gap-2">
            {product.variant_options?.map((option) => {
              const optionPrice = getVariantPrice(product, option);
              const showPrice = hasVariantPrices && optionPrice !== product.price;
              return (
                <button
                  key={option}
                  onClick={() => setSelectedVariant(option)}
                  className={`
                    min-w-[3rem] px-4 py-2 rounded-lg border text-sm font-bold transition-all flex flex-col items-center gap-0.5
                    ${selectedVariant === option 
                      ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 scale-105' 
                      : 'bg-background hover:border-primary/50 hover:bg-muted'
                    }
                  `}
                >
                  <span>{option}</span>
                  {showPrice && (
                    <span className={`text-xs font-medium ${selectedVariant === option ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {formatCurrency(optionPrice)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button 
        size="lg" 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg h-14 rounded-2xl shadow-sm transition-transform active:scale-95 glow-primary" 
        onClick={handleAddToCart}
      >
        Add to cart
      </Button>
      <div className="bg-secondary/50 rounded-full py-2 px-4 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          Envío rápido disponible
        </p>
      </div>
    </div>
  );
}
