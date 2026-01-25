import { Product } from "@/types/skating-store";
import { ProductGrid } from "../products/ProductGrid";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Productos Destacados</h2>
        <Link href="/skating-store/catalogo" className="text-primary hover:underline flex items-center">
          Ver todos <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
