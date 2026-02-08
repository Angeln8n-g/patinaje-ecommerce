"use client";

import { useEffect, useState } from "react";
import { CheckoutForm } from "@/components/skating-store/checkout/CheckoutForm";
import { OrderSummary } from "@/components/skating-store/checkout/OrderSummary";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { createOrder, getProfile, updateProfile } from "@/lib/skating-store/supabase-queries";
import { generateAndSendInvoice } from "@/lib/skating-store/invoice-actions";
import { sendOrderNotification } from "@/lib/skating-store/notification-actions";
import { createInAppNotification } from "@/lib/skating-store/in-app-notifications";
import { ShippingInfo } from "@/types/skating-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckoutPage() {
  const { items, total, clearCart } = useSkatingCart();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const [initialValues, setInitialValues] = useState<Partial<ShippingInfo> | undefined>(undefined);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const profile = await getProfile(user.id);
        if (profile) {
          const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
          setInitialValues({
            fullName: fullName || "",
            address: profile.address_street || "",
            city: profile.address_city || "",
            postalCode: profile.address_postal_code || "",
            phone: profile.phone || "",
          });
        }
      } else {
        setInitialValues(undefined);
      }
    };
    loadProfile();
  }, [user]);

  const handleCheckout = async (data: ShippingInfo & { paymentMethod: 'card' | 'cash' }) => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error("Debes iniciar sesión para confirmar el pedido");
        router.push("/login");
        return;
      }

      // Capture customer location for delivery proximity detection
      let shippingWithCoords = { ...data };
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        shippingWithCoords.lat = position.coords.latitude;
        shippingWithCoords.lng = position.coords.longitude;
      } catch {
        // Location not available — proximity detection won't work but order proceeds
      }

      const order = await createOrder(items, shippingWithCoords, total, data.paymentMethod);
      
      // Notificar al usuario que el pedido ha sido recibido (Email)
      try {
        await sendOrderNotification({
          orderId: order.id,
          customerName: data.fullName,
          customerEmail: user.email || "",
          status: 'RECEIVED'
        });
        
        // Notificación In-App
        await createInAppNotification({
          user_id: user.id,
          order_id: order.id,
          title: "¡Pedido Recibido!",
          message: `Tu pedido #${order.id.slice(0, 8)} ha sido recibido y está siendo procesado.`,
          type: 'success'
        });
      } catch (notifError) {
        console.error("Error sending initial order notification:", notifError);
      }

      // Si el pago es con tarjeta, generar factura automáticamente
      if (data.paymentMethod === 'card') {
        try {
          await generateAndSendInvoice(order.id, user.email || "", total);
        } catch (invoiceError) {
          console.error("Error generating automatic invoice:", invoiceError);
          // No bloqueamos el flujo principal si falla la factura
        }
      }

      await updateProfile(user.id, {
        first_name: data.fullName.split(" ")[0] || null,
        last_name: data.fullName.split(" ").slice(1).join(" ") || null,
        address_street: data.address,
        address_city: data.city,
        address_postal_code: data.postalCode,
        phone: data.phone,
      });
      clearCart();
      router.push(`/skating-store/checkout/success?orderId=${order.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al procesar tu pedido. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      {items.length === 0 ? (
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-muted-foreground">Agrega productos para continuar.</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-4">Información de Envío</h2>
              <CheckoutForm 
                onSubmit={handleCheckout} 
                isLoading={isLoading} 
                initialValues={initialValues} 
                disabled={!user}
                onLogin={() => router.push("/login")}
              />
            </div>
            <div>
              <OrderSummary />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
