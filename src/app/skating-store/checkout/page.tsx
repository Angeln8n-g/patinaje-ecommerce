"use client";

import { useEffect, useState } from "react";
import { CheckoutForm } from "@/components/skating-store/checkout/CheckoutForm";
import { OrderSummary } from "@/components/skating-store/checkout/OrderSummary";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { createOrder, getProfile, updateProfile } from "@/lib/skating-store/supabase-queries";
import { generateAndSendInvoice, sendProformaInvoice } from "@/lib/skating-store/invoice-actions";
import { sendOrderNotification, sendAdminNewOrderEmail } from "@/lib/skating-store/notification-actions";
import { createInAppNotification, notifyAdminsNewOrder } from "@/lib/skating-store/in-app-notifications";
import { ShippingInfo } from "@/types/skating-store";
import type { FiscalData } from "@/components/skating-store/checkout/FiscalInvoiceModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckoutPage() {
  const { items, total, clearCart } = useSkatingCart();
  const [isLoading, setIsLoading] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [isWithinFreeZone, setIsWithinFreeZone] = useState(false);
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

  const handleCheckout = async (data: ShippingInfo & { paymentMethod: 'card' | 'cash' }, shippingTotal: number, fiscalData?: FiscalData) => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error("Debes iniciar sesión para confirmar el pedido");
        router.push("/login");
        return;
      }

      let shippingWithCoords = { ...data };
      if (!shippingWithCoords.lat || !shippingWithCoords.lng) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          shippingWithCoords.lat = position.coords.latitude;
          shippingWithCoords.lng = position.coords.longitude;
        } catch {
          // Location not available
        }
      }

      const finalTotal = total + shippingTotal;
      const order = await createOrder(items, { ...shippingWithCoords, email: user.email || "" }, finalTotal, data.paymentMethod, fiscalData);

      const invoiceData = {
        orderId: order.id,
        customerEmail: user.email || "",
        customerName: data.fullName,
        address: data.address,
        city: data.city,
        phone: data.phone,
        items,
        subtotal: total,
        shippingCost: shippingTotal,
        total: finalTotal,
        paymentMethod: data.paymentMethod,
        fiscalData: fiscalData || null,
      };
      
      try {
        await sendOrderNotification({
          orderId: order.id,
          customerName: data.fullName,
          customerEmail: user.email || "",
          status: 'RECEIVED'
        });
        
        await createInAppNotification({
          user_id: user.id,
          order_id: order.id,
          title: "¡Pedido Recibido!",
          message: `Tu pedido #${order.id.slice(0, 8)} ha sido recibido y está siendo procesado.`,
          type: 'success'
        });

        // Send proforma (pre-invoice) for all orders
        await sendProformaInvoice(invoiceData);
      } catch (notifError) {
        console.error("Error sending initial notifications:", notifError);
      }

      // Notify admins about the new order (in-app + email)
      try {
        const adminResult = await notifyAdminsNewOrder({
          orderId: order.id,
          customerName: data.fullName,
          total: finalTotal,
          paymentMethod: data.paymentMethod,
          address: data.address,
          city: data.city,
          itemCount: items.length,
        });

        // Send email to admin emails returned by the API
        if (adminResult?.emails?.length) {
          await sendAdminNewOrderEmail({
            orderId: order.id,
            customerName: data.fullName,
            customerEmail: user.email || "",
            address: data.address,
            city: data.city,
            phone: data.phone,
            total: finalTotal,
            paymentMethod: data.paymentMethod,
            itemCount: items.length,
            adminEmails: adminResult.emails,
          });
        }
      } catch (adminNotifError) {
        console.error("Error notifying admins:", adminNotifError);
      }

      // If card payment, also send final invoice immediately (payment is instant)
      if (data.paymentMethod === 'card') {
        try {
          await generateAndSendInvoice(invoiceData);
        } catch (invoiceError) {
          console.error("Error generating final invoice:", invoiceError);
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
                onShippingCostChange={setShippingCost}
                onShippingZoneChange={setIsWithinFreeZone}
              />
            </div>
            <div>
              <OrderSummary shippingCost={shippingCost} isWithinFreeZone={isWithinFreeZone} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
