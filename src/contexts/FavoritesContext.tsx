"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { Product } from "@/types/skating-store";

interface FavoritesContextType {
  favorites: Product[];
  toggleFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const data = await authFetch<Product[]>("/api/favorites");
      setFavorites(data);
    } catch (err) {
      console.error("Error loading favorites:", err);
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar favoritos");
      return;
    }
    const isFav = favorites.some((p) => p.id === productId);
    if (isFav) {
      await removeFavorite(productId);
    } else {
      try {
        await authFetch("/api/favorites", { method: "POST", body: { product_id: productId } });
        // Reload to get full product data
        await loadFavorites();
        toast.success("Añadido a favoritos");
      } catch {
        toast.error("Error al añadir a favoritos");
      }
    }
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    try {
      await authFetch(`/api/favorites/${productId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Eliminado de favoritos");
    } catch {
      toast.error("Error al eliminar de favoritos");
    }
  };

  const isFavorite = (productId: string) => favorites.some((p) => p.id === productId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
}
