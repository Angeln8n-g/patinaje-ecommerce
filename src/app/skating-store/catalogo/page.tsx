import { ProductGrid } from "@/components/skating-store/products/ProductGrid";
import { CategoryFilter } from "@/components/skating-store/products/CategoryFilter";
import { getProducts } from "@/lib/skating-store/supabase-queries";
import { getCategories } from "@/lib/skating-store/content-actions";
import { ProductCategory } from "@/types/skating-store";

export const dynamic = 'force-dynamic';

interface CatalogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams;
  const category = (resolvedSearchParams?.category as ProductCategory) || null;
  
  const [products, categories] = await Promise.all([
    getProducts(category),
    getCategories()
  ]);

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Catálogo de Productos</h1>
        <p className="text-muted-foreground">Encuentra todo lo que necesitas para patinar</p>
      </div>
      
      <CategoryFilter categories={categories} />
      
      <ProductGrid products={products} />
    </div>
  );
}
