"use client";

import { useEffect, useRef, useState } from "react";
import { Product, Category } from "@/types/skating-store";
import { ProductGrid } from "@/components/skating-store/products/ProductGrid";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfiniteCatalogProps {
  initialProducts: Product[];
  categories: Category[];
}

export function InfiniteCatalog({ initialProducts, categories }: InfiniteCatalogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Group products by category
  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: initialProducts.filter(p => p.category === cat.slug)
  })).filter(group => group.products.length > 0);

  // Products without category or in "Other"
  const otherProducts = initialProducts.filter(p => !categories.some(c => c.slug === p.category));
  if (otherProducts.length > 0) {
    productsByCategory.push({
      id: "others",
      name: "Otros Productos",
      slug: "others",
      description: "Otros productos",
      created_at: new Date().toISOString(), // Add dummy date to satisfy type
      products: otherProducts
    });
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full pb-20">
      {/* Trigger point - The "See more" or auto-scroll area */}
      <div 
        ref={triggerRef} 
        className={cn(
          "flex flex-col items-center justify-center py-12 transition-opacity duration-500",
          isVisible ? "opacity-0 h-0 overflow-hidden py-0" : "opacity-100"
        )}
      >
        <span className="text-muted-foreground text-sm mb-2 animate-bounce">Scroll para ver más categorías</span>
        <ChevronDown className="h-6 w-6 text-muted-foreground animate-bounce" />
      </div>

      {/* Lazy Loaded Content */}
      <div className={cn(
        "transition-all duration-700 ease-in-out space-y-16",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 h-0 overflow-hidden"
      )}>
        {productsByCategory.map((categoryGroup) => (
          <section key={categoryGroup.id} className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl font-bold tracking-tight">{categoryGroup.name}</h2>
              <div className="h-px bg-border flex-1" />
            </div>
            <ProductGrid products={categoryGroup.products} />
          </section>
        ))}
      </div>
    </div>
  );
}
