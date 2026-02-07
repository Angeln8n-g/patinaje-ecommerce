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

  const isVideo = (url: string) => {
    return url.toLowerCase().match(/\.(mp4|webm|ogg)$/) || url.includes("video");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        {isVideo(selectedImage) ? (
          <video
            key={selectedImage}
            src={selectedImage}
            controls
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <Image
            src={selectedImage}
            alt={productName}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
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
              {isVideo(image) ? (
                <div className="flex h-full w-full items-center justify-center bg-black">
                  <video src={image} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="h-6 w-6 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="ml-0.5 h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <Image
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
