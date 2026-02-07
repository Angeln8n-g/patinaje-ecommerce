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
import { formatCurrency } from "@/lib/utils";

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

  // Helper to detect video
  const isVideo = (url?: string) => {
    if (!url) return false;
    return url.toLowerCase().match(/\.(mp4|webm|ogg)$/) || url.includes("video");
  };

  // Find first video in gallery if any
  const videoUrl = product.images.find(img => isVideo(img));
  const coverImage = product.images.find(img => !isVideo(img)) || product.images[0] || "https://placehold.co/600x600/png?text=Skate";

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

        <div className="relative aspect-square p-6 bg-[#F8F9FA] overflow-hidden">
          {/* Default Image */}
          <div className={`relative w-full h-full transition-opacity duration-300 ${videoUrl ? 'group-hover:opacity-0' : ''}`}>
             <Image
              src={coverImage}
              alt={product.name}
              fill
              className="object-contain mix-blend-multiply transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {/* Hover Video (if available) */}
          {videoUrl && (
            <div className="absolute inset-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <video
                src={videoUrl}
                className="w-full h-full object-cover rounded-xl"
                muted
                loop
                playsInline
                autoPlay={false} // Autoplay via JS on hover is more reliable, but CSS hover effect + autoplay attr works in modern browsers
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-base line-clamp-2 mb-2 min-h-[3rem]">{product.name}</h3>
          
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg">{formatCurrency(product.price)}</span>
            <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
              {formatCurrency(previousPrice)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
