"use client";

import { useRef, useState } from "react";
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
import { ColorDots } from "@/components/skating-store/products/ColorDots";
import { parseColorOptions } from "@/lib/skating-store/color-utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useSkatingCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleMouseEnter = () => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented or source invalid
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
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
    <Link 
      href={`/skating-store/producto/${product.id}`} 
      className="block h-full group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card className="h-full border border-border shadow-sm hover:shadow-[0_8px_30px_rgba(212,160,80,0.15)] transition-all duration-300 rounded-[32px] bg-card overflow-hidden relative group-hover:-translate-y-1">
        {/* Favorite Icon - Restored for design match */}
        <button 
          onClick={handleToggleFavorite}
          className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full transition-all duration-200 ${
            isFav ? "bg-card text-destructive shadow-sm" : "bg-card/60 text-muted-foreground hover:bg-card hover:text-destructive"
          }`}
        >
          <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
        </button>

        <div className="relative aspect-square p-6 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          {/* Default Image */}
          <div className={`relative w-full h-full transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
             <Image
              src={coverImage}
              alt={product.name}
              fill
              className="object-contain transition-transform group-hover:scale-105 group-hover:brightness-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {/* Hover Video (if available) */}
          {videoUrl && (
            <div className={`absolute inset-0 p-6 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
               <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover rounded-xl"
                muted
                loop
                playsInline
                preload="metadata"
                onPlaying={() => setIsPlaying(true)}
              />
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-base line-clamp-2 mb-2 min-h-[3rem]">{product.name}</h3>
          
          {product.variant_type === "color" && product.variant_options && product.variant_options.length > 0 && (
            <div className="mb-2">
              <ColorDots colors={parseColorOptions(product.variant_options)} />
            </div>
          )}

          <div className="flex items-baseline gap-2">
            {product.variant_prices && Object.keys(product.variant_prices).length > 0 ? (() => {
              const prices = Object.values(product.variant_prices as Record<string, number>);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              return minPrice === maxPrice ? (
                <span className="font-extrabold text-lg text-primary">{formatCurrency(minPrice)}</span>
              ) : (
                <span className="font-extrabold text-lg text-primary">
                  {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
                </span>
              );
            })() : (
              <>
                <span className="font-extrabold text-lg text-primary">{formatCurrency(product.price)}</span>
                <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  {formatCurrency(previousPrice)}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
