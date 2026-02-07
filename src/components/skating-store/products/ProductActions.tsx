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

    addItem(product, quantity);
    toast.success(`${quantity}x ${product.name} agregado al carrito`);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button 
        size="lg" 
        className="w-full bg-[#D7F000] text-black hover:bg-[#CBE600] font-bold text-lg h-14 rounded-2xl shadow-sm transition-transform active:scale-95" 
        onClick={handleAddToCart}
      >
        Add to cart
      </Button>
      <div className="bg-secondary/50 rounded-full py-2 px-4 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          Delivery on 26 October
        </p>
      </div>
    </div>
  );
}
