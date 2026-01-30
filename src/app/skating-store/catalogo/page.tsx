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
  const search = (resolvedSearchParams?.search as string) || null;
  
  const [products, categories] = await Promise.all([
    getProducts(category, search),
    getCategories()
  ]);

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Catálogo de Productos</h1>
         {search && (
           <p className="text-muted-foreground mb-2">
             Resultados para: <span className="font-semibold text-primary">{search}</span>
           </p>
         )}
        <p className="text-muted-foreground">Encuentra todo lo que necesitas para patinar</p>
      </div>
      
      <CategoryFilter categories={categories} />
      
      <ProductGrid products={products} />
    </div>
  );
}
