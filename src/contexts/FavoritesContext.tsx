"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { Product } from "@/types/skating-store";

interface FavoritesContextType {
  favorites: Product[]; // List of full products
  toggleFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  const loadFavorites = async () => {
    // 1. Get favorite IDs
    const { data: favData, error: favError } = await supabase
      .from("favorites")
      .select("product_id");

    if (favError) {
      console.error("Error loading favorites:", favError);
      return;
    }

    if (!favData || favData.length === 0) {
      setFavorites([]);
      return;
    }

    const productIds = favData.map((f) => f.product_id);

    // 2. Get products details
    const { data: productsData, error: prodError } = await supabase
      .from("skating_products")
      .select("*")
      .in("id", productIds);

    if (prodError) {
      console.error("Error loading favorite products:", prodError);
      return;
    }

    setFavorites(productsData as Product[]);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar favoritos");
      return;
    }

    const isFav = favorites.some(p => p.id === productId);

    if (isFav) {
      await removeFavorite(productId);
    } else {
      // Add
      const { error } = await supabase
        .from("favorites")
        .insert([{ user_id: user.id, product_id: productId }]);

      if (error) {
        toast.error("Error al añadir a favoritos");
        return;
      }

      // Optimistically fetch the product to add it to state, or reload
      // For simplicity, let's reload or just fetch this single product
      const { data: newProduct } = await supabase
        .from("skating_products")
        .select("*")
        .eq("id", productId)
        .single();
      
      if (newProduct) {
        setFavorites((prev) => [...prev, newProduct as Product]);
        toast.success("Añadido a favoritos");
      }
    }
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("product_id", productId);

    if (error) {
      toast.error("Error al eliminar de favoritos");
      return;
    }
    
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
    toast.success("Eliminado de favoritos");
  };

  const isFavorite = (productId: string) => favorites.some(p => p.id === productId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
