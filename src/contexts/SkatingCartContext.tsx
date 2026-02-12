"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Product } from "@/types/skating-store";
import { useAuth } from "./AuthContext";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, variant?: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: number;
  itemCount: number;
  isLoading: boolean;
}

const SkatingCartContext = createContext<CartContextType | undefined>(undefined);

export function SkatingCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setItems([]);
    }
  }, [user]);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const data = await authFetch<CartItem[]>("/api/cart");
      setItems(data);
    } catch (err) {
      console.error("Error loading cart:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (product: Product, quantity: number, variant?: string) => {
    if (!user) {
      toast.error("Debes iniciar sesión para comprar", {
        description: "Regístrate o inicia sesión para agregar productos al carrito.",
        action: { label: "Ir a Login", onClick: () => router.push("/login") },
      });
      return;
    }
    setIsLoading(true);
    try {
      setItems((curr) => {
        const existing = curr.find((i) => i.product.id === product.id && i.selectedVariant === variant);
        if (existing) {
          return curr.map((i) =>
            i.product.id === product.id && i.selectedVariant === variant
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        return [...curr, { product, quantity, selectedVariant: variant }];
      });
      await authFetch("/api/cart", {
        method: "POST",
        body: { product_id: product.id, quantity, selected_variant: variant },
      });
      toast.success("Añadido al carrito");
    } catch {
      toast.error("Error al agregar al carrito");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      setItems((curr) => curr.filter((i) => i.product.id !== productId));
      await authFetch(`/api/cart/${productId}`, { method: "DELETE" });
    } catch {
      toast.error("Error al eliminar del carrito");
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) { await removeItem(productId); return; }
    if (!user) return;
    try {
      setItems((curr) => curr.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
      await authFetch(`/api/cart/${productId}`, { method: "PUT", body: { quantity } });
    } catch {
      console.error("Error updating quantity");
    }
  };

  const clearCart = async () => {
    if (!user) { setItems([]); return; }
    setIsLoading(true);
    try {
      setItems([]);
      await authFetch("/api/cart", { method: "DELETE" });
    } catch {
      console.error("Error clearing cart");
    } finally {
      setIsLoading(false);
    }
  };

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <SkatingCartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, isLoading }}>
      {children}
    </SkatingCartContext.Provider>
  );
}

export function useSkatingCart() {
  const context = useContext(SkatingCartContext);
  if (!context) throw new Error("useSkatingCart must be used within SkatingCartProvider");
  return context;
}
