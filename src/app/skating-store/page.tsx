import { FeaturedProducts } from "@/components/skating-store/home/FeaturedProducts";
import { CategoryShowcase } from "@/components/skating-store/home/CategoryShowcase";
import { PromoCarousel } from "@/components/skating-store/home/PromoCarousel";
import { DeliveryPromoBanner } from "@/components/skating-store/home/DeliveryPromoBanner";
import { InfiniteCatalog } from "@/components/skating-store/home/InfiniteCatalog";
import { getProducts } from "@/lib/skating-store/supabase-queries";
import { getBanners, getCategories, getActivePromoTextBanner } from "@/lib/skating-store/content-actions";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, banners, categories, activePromo] = await Promise.all([
    getProducts(),
    getBanners(true), // Fetch only active banners
    getCategories(),
    getActivePromoTextBanner()
  ]);
  
  const featuredProducts = products.filter(p => p.featured).slice(0, 4);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Promo Banner from DB */}
      <DeliveryPromoBanner promo={activePromo} />

      {/* Dynamic Banners (if any) - Optional / Secondary */}
      {banners.length > 0 && (
        <div className="container mx-auto px-4">
           <PromoCarousel banners={banners} />
        </div>
      )}

      {/* Category Section */}
      <CategoryShowcase categories={categories} />
      
      {/* Flash Sale Section */}
      <FeaturedProducts products={featuredProducts} />

      {/* Infinite Scroll Catalog Section */}
      <InfiniteCatalog initialProducts={products} categories={categories} />
    </div>
  );
}
