import { ProductGrid } from "@/components/skating-store/products/ProductGrid";
import { CategoryFilter } from "@/components/skating-store/products/CategoryFilter";
import { PromoCarousel } from "@/components/skating-store/home/PromoCarousel";
import { getProductsFilteredServer } from "@/lib/skating-store/product-queries";
import { getCategories, getBannersByCategory } from "@/lib/skating-store/content-queries";
import { ProductCategory } from "@/types/skating-store";

export const dynamic = 'force-dynamic';

interface CatalogPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams;
  const category = (resolvedSearchParams?.category as ProductCategory) || null;
  const search = (resolvedSearchParams?.search as string) || null;
  
  const [products, categories, categoryBanners] = await Promise.all([
    getProductsFilteredServer(category, search),
    getCategories(),
    category ? getBannersByCategory(category) : Promise.resolve([])
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

      {categoryBanners.length > 0 && (
        <div className="w-full mb-6">
          <PromoCarousel banners={categoryBanners} />
        </div>
      )}
      
      <ProductGrid products={products} />
    </div>
  );
}
