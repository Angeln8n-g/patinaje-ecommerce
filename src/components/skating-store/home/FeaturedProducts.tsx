"use client";

import { Product } from "@/types/skating-store";
import { ProductGrid } from "../products/ProductGrid";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getStaticContentClient } from "@/lib/skating-store/supabase-queries";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [flashSaleEnd, setFlashSaleEnd] = useState<string | null>(null);

  useEffect(() => {
    // Fetch flash sale end time
    getStaticContentClient('site-settings').then(settings => {
      if (settings?.data && typeof settings.data.flash_sale_end === 'string') {
        setFlashSaleEnd(settings.data.flash_sale_end);
      }
    });
  }, []);

  useEffect(() => {
    if (!flashSaleEnd) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const endTime = new Date(flashSaleEnd).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setTimeLeft("00:00:00");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [flashSaleEnd]);

  if (!flashSaleEnd || timeLeft === "00:00:00") {
    // Opcional: Ocultar sección o mostrar sin contador si expiró
    // Por ahora mostramos "Expired" o nada en el contador
  }

  return (
    <section className="mb-12 container mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Flash Sale</h2>
          {flashSaleEnd && timeLeft && timeLeft !== "00:00:00" && (
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <span className="font-mono tracking-widest">{timeLeft}</span>
            </div>
          )}
        </div>
        <Link href="/skating-store/catalogo" className="text-sm text-muted-foreground hover:text-primary flex items-center transition-colors">
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
