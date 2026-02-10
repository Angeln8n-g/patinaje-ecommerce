"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POSProductSearch } from "@/components/seller/POSProductSearch";
import { POSCart } from "@/components/seller/POSCart";
import { POSPayment } from "@/components/seller/POSPayment";
import { POSReceipt } from "@/components/seller/POSReceipt";
import { CashSessionManager } from "@/components/seller/CashSessionManager";
import { createPOSOrder, getActiveSession } from "@/lib/skating-store/pos-actions";
import { Product, POSCartItem, PaymentInfo, Order, PosSession } from "@/types/skating-store";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function POSPage() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastChange, setLastChange] = useState<number | undefined>();
  const [loadingSession, setLoadingSession] = useState(true);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Load active session on mount
  useEffect(() => {
    getActiveSession()
      .then((session) => setActiveSession(session))
      .catch(() => {})
      .finally(() => setLoadingSession(false));
  }, []);

  // Block navigation while session is open
  useEffect(() => {
    if (!activeSession) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeSession]);

  const handleAddProduct = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const availableStock = stockMap.get(product.id) ?? product.stock;

      if (currentQty + 1 > availableStock) {
        toast.error(`Stock insuficiente para "${product.name}". Disponible: ${availableStock}`);
        return prev;
      }

      if (!stockMap.has(product.id)) {
        setStockMap((m) => new Map(m).set(product.id, product.stock));
      }

      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }, [stockMap]);

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product_id !== productId));
      return;
    }

    const availableStock = stockMap.get(productId) ?? 0;
    if (quantity > availableStock) {
      toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  }, [stockMap]);

  const handleRemoveItem = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product_id !== productId));
  }, []);

  const handleConfirmSale = async (
    payment: PaymentInfo,
    customerName: string,
    customerPhone?: string
  ) => {
    if (cartItems.length === 0) return;

    setProcessing(true);
    try {
      const order = await createPOSOrder(cartItems, payment, customerName, customerPhone);

      const change =
        payment.method === "cash" && payment.amount_received
          ? payment.amount_received - total
          : undefined;

      setLastOrder(order);
      setLastChange(change);
      setCartItems([]);
      setStockMap(new Map());
      toast.success("Venta completada");
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la venta");
    } finally {
      setProcessing(false);
    }
  };

  const handleSessionChange = (session: PosSession | null) => {
    setActiveSession(session);
  };

  if (loadingSession) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no active session, show the session manager
  if (!activeSession) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Punto de Venta</h1>
        <CashSessionManager
          activeSession={null}
          onSessionChange={handleSessionChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Punto de Venta</h1>
        <CashSessionManager
          activeSession={activeSession}
          onSessionChange={handleSessionChange}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buscar Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <POSProductSearch onSelectProduct={handleAddProduct} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carrito</CardTitle>
            </CardHeader>
            <CardContent>
              <POSCart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <POSPayment
            total={total}
            onConfirm={handleConfirmSale}
            processing={processing}
          />
        </div>
      </div>

      {lastOrder && (
        <POSReceipt
          order={lastOrder}
          sellerName={user?.email || "Vendedor"}
          change={lastChange}
          onClose={() => setLastOrder(null)}
        />
      )}
    </div>
  );
}
