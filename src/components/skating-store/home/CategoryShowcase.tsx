"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@/types/skating-store";
import { ChevronRight, Disc, Footprints, Shield, Shirt, Package, Component } from "lucide-react";
import { useEffect, useState } from "react";
import { getStaticContentClient } from "@/lib/skating-store/supabase-queries";

interface CategoryShowcaseProps {
  categories?: Category[];
}

// Map common categories to icons based on slug or explicit icon_name
const getCategoryIcon = (slug: string, iconName?: string, iconUrl?: string) => {
  if (iconUrl) {
    return <Image src={iconUrl} alt={slug} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />;
  }
  if (iconName) {
    switch (iconName) {
      case "Package": return <Package className="h-8 w-8" />;
      case "Component": return <Component className="h-8 w-8" />;
      case "Footprints": return <Footprints className="h-8 w-8" />;
      case "Shield": return <Shield className="h-8 w-8" />;
      case "Disc": return <Disc className="h-8 w-8" />;
      case "Shirt": return <Shirt className="h-8 w-8" />;
      default: break;
    }
  }
  if (slug.includes('patines')) return <Footprints className="h-8 w-8" />;
  if (slug.includes('ruedas')) return <Disc className="h-8 w-8" />;
  if (slug.includes('botas')) return <Footprints className="h-8 w-8" />;
  if (slug.includes('protecciones')) return <Shield className="h-8 w-8" />;
  if (slug.includes('accesorios')) return <Package className="h-8 w-8" />;
  if (slug.includes('bases')) return <Component className="h-8 w-8" />;
  return null;
};

export function CategoryShowcase({ categories = [] }: CategoryShowcaseProps) {
  const displayCategories = categories.length > 0 ? categories : [];
  const [speed, setSpeed] = useState(40);

  useEffect(() => {
    getStaticContentClient('site-settings').then(settings => {
      if (settings?.data && typeof settings.data.carousel_speed === 'number') {
        setSpeed(settings.data.carousel_speed);
      }
    });
  }, []);

  return (
    <section className="mb-12 container mx-auto px-4">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
        <Link href="/skating-store/catalogo" className="text-sm text-muted-foreground hover:text-primary flex items-center">
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {displayCategories.length === 0 ? (
        <p className="text-muted-foreground">No hay categorías disponibles.</p>
      ) : (
        <div className="relative w-full overflow-hidden pause-on-hover">
          <div 
            className="flex gap-8 w-full md:w-max overflow-x-auto md:overflow-hidden pb-4 md:pb-0 justify-start md:justify-center animate-none md:animate-infinite-scroll hover:animation-play-state-paused touch-pan-x snap-x snap-mandatory md:snap-none no-scrollbar"
            style={{ 
              animationDuration: `${speed}s`,
            }}
          >
            {/* Duplicamos las categorías para crear el efecto de bucle infinito suave solo en desktop */}
            {[...displayCategories, ...displayCategories, ...displayCategories].map((category, index) => (
              <Link 
                key={`${category.id}-${index}`} 
                href={`/skating-store/catalogo?category=${category.slug}`} 
                className="group flex flex-col items-center gap-3 min-w-[80px] snap-center shrink-0"
              >
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-secondary border border-border flex items-center justify-center transition-all group-hover:bg-primary group-hover:shadow-lg group-hover:scale-105">
                  {/* Icon or Letter */}
                  <div className="text-muted-foreground group-hover:text-primary-foreground">
                     {getCategoryIcon(category.slug, category.icon_name, category.icon_url) || (
                       <span className="text-2xl font-bold">
                         {category.name.charAt(0).toUpperCase()}
                       </span>
                     )}
                  </div>
                </div>
                <span className="text-sm font-medium text-center truncate w-full group-hover:text-primary transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
