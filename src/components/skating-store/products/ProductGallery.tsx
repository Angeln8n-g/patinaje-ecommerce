"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const defaultImage = "https://placehold.co/600x600/png?text=Skate";
  const [selectedImage, setSelectedImage] = useState(images[0] || defaultImage);

  const displayImages = images.length > 0 ? images : [defaultImage];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          className="object-cover"
          priority
        />
      </div>
      {displayImages.length > 1 && (
        <div className="flex gap-4 overflow-auto pb-2 scrollbar-hide">
          {displayImages.map((image, index) => (
            <button
              key={index}
              className={cn(
                "relative aspect-square w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted transition-all hover:opacity-100",
                selectedImage === image ? "ring-2 ring-primary opacity-100" : "opacity-70"
              )}
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
