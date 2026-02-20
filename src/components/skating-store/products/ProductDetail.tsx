"use client";

import { useState } from "react";
import { Product } from "@/types/skating-store";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";
import { Star, ShieldCheck, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductDetailProps {
  product: Product;
  averageRating: string;
  reviewCount: number;
}

export function ProductDetail({ product, averageRating, reviewCount }: ProductDetailProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");

  const isColorVariant = product.variant_type === "color";
  const variantImages = product.variant_images || {};

  // Show variant-specific image when a color with an image is selected
  const activeImage = isColorVariant && selectedColor && variantImages[selectedColor]
    ? variantImages[selectedColor]
    : null;

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
      <div>
        <ProductGallery
          images={product.images}
          productName={product.name}
          activeImage={activeImage}
        />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">{product.name}</h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 bg-[#FFFBEB] px-4 py-2 rounded-full border border-[#FEF3C7]">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-sm text-foreground">{averageRating}</span>
              <span className="text-xs text-muted-foreground font-medium">{reviewCount} reseñas</span>
            </div>
            <div className="flex items-center gap-2 bg-[#ECFDF5] px-4 py-2 rounded-full border border-[#D1FAE5]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-sm text-emerald-700">94%</span>
            </div>
            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold text-sm text-muted-foreground">{reviewCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            {product.variant_prices && Object.keys(product.variant_prices).length > 0 ? (() => {
              const prices = Object.values(product.variant_prices as Record<string, number>);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              return minPrice === maxPrice ? (
                <div className="text-4xl font-extrabold">{formatCurrency(minPrice)}</div>
              ) : (
                <div className="text-4xl font-extrabold">
                  {formatCurrency(minPrice)} <span className="text-2xl text-muted-foreground font-medium">–</span> {formatCurrency(maxPrice)}
                </div>
              );
            })() : (
              <div className="text-4xl font-extrabold">{formatCurrency(product.price)}</div>
            )}
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground text-base leading-relaxed">
          <p>{product.description}</p>
        </div>

        <div className="mt-auto pt-6">
          <ProductActions
            product={product}
            onColorChange={isColorVariant ? setSelectedColor : undefined}
          />
        </div>
      </div>
    </div>
  );
}
