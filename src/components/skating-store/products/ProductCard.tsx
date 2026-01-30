"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/skating-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { Heart } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useSkatingCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  // Simulate a previous price for the "Flash Sale" look
  const previousPrice = product.price * 1.2;
  const isFav = isFavorite(product.id);

  return (
    <Link href={`/skating-store/producto/${product.id}`} className="block h-full group">
      <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[32px] bg-card overflow-hidden relative group-hover:-translate-y-1">
        {/* Favorite Icon - Restored for design match */}
        <button 
          onClick={handleToggleFavorite}
          className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full transition-all duration-200 ${
            isFav ? "bg-white text-destructive shadow-sm" : "bg-white/60 text-muted-foreground hover:bg-white hover:text-destructive"
          }`}
        >
          <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
        </button>

        <div className="relative aspect-square p-6 bg-[#F8F9FA]">
          <Image
            src={product.images[0] || "https://placehold.co/600x600/png?text=Skate"}
            alt={product.name}
            fill
            className="object-contain mix-blend-multiply transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-base line-clamp-2 mb-2 min-h-[3rem]">{product.name}</h3>
          
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg">${product.price.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
              ${previousPrice.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
