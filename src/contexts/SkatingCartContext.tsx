"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@/types/skating-store';
import { useAuth } from './AuthContext';
import { getCart, addToCart, updateCartItemQuantity, removeFromCart, clearCart as clearCartAction } from '@/lib/skating-store/cart-actions';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => Promise<void>;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Load cart from DB if user is logged in
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const cartItems = await getCart(user.id);
          setItems(cartItems);
        } catch (error) {
          console.error("Error loading cart from DB:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setItems([]);
      }
      setIsLoaded(true);
    };

    loadCart();
  }, [user]);

  // Save to local storage logic removed as we enforce login
  useEffect(() => {
    // Legacy cleanup or empty effect
  }, []);

  const addItem = async (product: Product, quantity: number) => {
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

    setIsLoading(true);
    try {
      // Optimistic update
      setItems(currentItems => {
        const existingItem = currentItems.find(item => item.product.id === product.id);
        if (existingItem) {
          return currentItems.map(item => 
            item.product.id === product.id 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...currentItems, { product, quantity }];
      });

      const result = await addToCart(user.id, product.id, quantity);
      if (!result.success) {
        console.error("Detailed server error:", result.error);
        throw new Error(typeof result.error === 'string' ? result.error : "Failed to add to cart");
      }
      toast.success("Añadido al carrito");
      
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Error al agregar al carrito");
      // Revert optimistic update could be implemented here
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
      await removeFromCart(user.id, productId);
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Error al eliminar del carrito");
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    if (!user) return;

    try {
      setItems(currentItems => 
        currentItems.map(item => 
          item.product.id === productId 
            ? { ...item, quantity }
            : item
        )
      );
      await updateCartItemQuantity(user.id, productId, quantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const clearCart = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      setItems([]);
      await clearCartAction(user.id);
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SkatingCartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, isLoading }}>
      {children}
    </SkatingCartContext.Provider>
  );
}

export function useSkatingCart() {
  const context = useContext(SkatingCartContext);
  if (context === undefined) {
    throw new Error('useSkatingCart must be used within a SkatingCartProvider');
  }
  return context;
}
