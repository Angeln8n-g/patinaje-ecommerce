"use client";

import { useState } from "react";
import { CheckoutForm } from "@/components/skating-store/checkout/CheckoutForm";
import { OrderSummary } from "@/components/skating-store/checkout/OrderSummary";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { createOrder } from "@/lib/skating-store/supabase-queries";
import { ShippingInfo } from "@/types/skating-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { items, total, clearCart } = useSkatingCart();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <p className="text-muted-foreground">Agrega productos para continuar.</p>
      </div>
    );
  }

  const handleCheckout = async (data: ShippingInfo) => {
    setIsLoading(true);
    try {
      await createOrder(items, data, total);
      clearCart();
      router.push("/skating-store/checkout/success");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al procesar tu pedido. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
        <div>
          <h2 className="text-xl font-semibold mb-4">Información de Envío</h2>
          <CheckoutForm onSubmit={handleCheckout} isLoading={isLoading} />
        </div>
        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
