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

  // Helper to validate image URL
  const getValidImageUrl = (url: string) => {
    if (!url) return "https://placehold.co/1200x500/png?text=No+Image";
    if (url.startsWith("/")) return url;
    try {
      new URL(url);
      return url;
    } catch {
      return "https://placehold.co/1200x500/png?text=Invalid+Image";
    }
  };

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

  // Helper to check if URL is a video
  const isVideo = (url: string) => {
    return url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  };

  return (
    <section className="relative h-[450px] md:h-[600px] lg:h-[700px] w-full overflow-hidden mb-12 group">
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Media */}
          <div className="absolute inset-0">
            {isVideo(banner.image_url) ? (
              <video
                src={banner.image_url}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <Image
                src={getValidImageUrl(banner.image_url)}
                alt={banner.title}
                fill
                className="object-cover object-center scale-105 transition-transform duration-[10s] ease-linear"
                style={{
                  transform: index === currentIndex ? 'scale(1.1)' : 'scale(1)'
                }}
                priority={index === 0}
                unoptimized={banner.image_url.toLowerCase().endsWith('.gif')}
              />
            )}
            {/* Overlay - Gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent md:bg-gradient-to-b md:from-black/40 md:to-black/60" />
          </div>

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6 max-w-5xl mx-auto text-white">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl uppercase italic">
              {banner.title}
            </h2>
            {banner.description && (
              <p className="text-xl md:text-2xl lg:text-3xl mb-10 drop-shadow-md max-w-3xl font-medium leading-tight text-white/90">
                {banner.description}
              </p>
            )}
            {banner.link_url && (
              <Link href={banner.link_url}>
                <Button size="lg" className="text-xl px-12 py-8 rounded-full bg-[#D7F000] text-black hover:bg-white transition-all duration-300 font-black uppercase tracking-widest border-none shadow-[0_0_20px_rgba(215,240,0,0.3)]">
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
          <div className="absolute inset-y-0 left-0 w-24 z-30 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-black/10 text-white hover:bg-[#D7F000] hover:text-black transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 w-24 z-30 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-black/10 text-white hover:bg-[#D7F000] hover:text-black transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
              onClick={nextSlide}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 transition-all duration-500 rounded-full ${
                  index === currentIndex ? "bg-[#D7F000] w-12" : "bg-white/30 w-6 hover:bg-white/60"
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
