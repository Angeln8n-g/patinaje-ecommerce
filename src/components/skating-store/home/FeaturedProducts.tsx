import { Product } from "@/types/skating-store";
import { ProductGrid } from "../products/ProductGrid";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="mb-12 container mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Flash Sale</h2>
          <div className="bg-[#D7F000] text-black px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
            <span className="font-mono tracking-widest">02:59:23</span>
          </div>
        </div>
        <Link href="/skating-store/catalogo" className="text-sm text-muted-foreground hover:text-primary flex items-center transition-colors">
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
