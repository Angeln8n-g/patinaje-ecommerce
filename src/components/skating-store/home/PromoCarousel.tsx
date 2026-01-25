"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Banner } from "@/types/skating-store";

interface PromoCarouselProps {
  banners: Banner[];
}

export function PromoCarousel({ banners }: PromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) {
    return null; // Or return default hero
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <section className="relative h-[400px] md:h-[500px] w-full overflow-hidden rounded-lg mb-12 group">
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={banner.image_url}
              alt={banner.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 max-w-4xl mx-auto text-white">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-md">
              {banner.title}
            </h2>
            {banner.description && (
              <p className="text-xl md:text-2xl mb-8 drop-shadow-sm max-w-2xl">
                {banner.description}
              </p>
            )}
            {banner.link_url && (
              <Link href={banner.link_url}>
                <Button size="lg" className="text-lg px-8">
                  Ver Oferta
                </Button>
              </Link>
            )}
          </div>
        </div>
      ))}

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-black/20 hover:text-white hidden group-hover:flex"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-white hover:bg-black/20 hover:text-white hidden group-hover:flex"
            onClick={nextSlide}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
