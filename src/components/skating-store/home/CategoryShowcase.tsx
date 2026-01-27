import Link from "next/link";
import { Category } from "@/types/skating-store";
import { ChevronRight, Disc, Footprints, Shield, Shirt, Package, Component } from "lucide-react";

interface CategoryShowcaseProps {
  categories?: Category[];
}

// Map common categories to icons
const getCategoryIcon = (slug: string) => {
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
        <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
          {displayCategories.map((category) => (
            <Link key={category.id} href={`/skating-store/catalogo?category=${category.slug}`} className="group flex flex-col items-center gap-3 min-w-[80px]">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-secondary flex items-center justify-center transition-all group-hover:bg-primary group-hover:shadow-lg group-hover:scale-105">
                {/* Icon or Letter */}
                <div className="text-muted-foreground group-hover:text-primary-foreground">
                   {getCategoryIcon(category.slug) || (
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
      )}
    </section>
  );
}
