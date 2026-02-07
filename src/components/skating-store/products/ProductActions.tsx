"use client";

import { useState } from "react";
import { Product } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

    // Validate variant selection
    if (product.variant_type && product.variant_type !== 'none' && !selectedVariant) {
      toast.error(`Por favor selecciona ${product.variant_type === 'size' ? 'una talla' : 'una medida'}`);
      return;
    }

    addItem(product, quantity, selectedVariant);
    toast.success(`${quantity}x ${product.name} agregado al carrito`);
  };

  const showVariants = product.variant_type && product.variant_type !== 'none' && product.variant_options && product.variant_options.length > 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {showVariants && (
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {product.variant_type === 'size' ? 'Selecciona Talla' : 'Selecciona Medida'}
          </label>
          <div className="flex flex-wrap gap-2">
            {product.variant_options?.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedVariant(option)}
                className={`
                  min-w-[3rem] px-4 py-2 rounded-lg border text-sm font-bold transition-all
                  ${selectedVariant === option 
                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 scale-105' 
                    : 'bg-background hover:border-primary/50 hover:bg-muted'
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button 
        size="lg" 
        className="w-full bg-[#D7F000] text-black hover:bg-[#CBE600] font-bold text-lg h-14 rounded-2xl shadow-sm transition-transform active:scale-95" 
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
