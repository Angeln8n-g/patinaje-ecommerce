import { HeroSection } from "@/components/skating-store/home/HeroSection";
import { FeaturedProducts } from "@/components/skating-store/home/FeaturedProducts";
import { CategoryShowcase } from "@/components/skating-store/home/CategoryShowcase";
import { PromoCarousel } from "@/components/skating-store/home/PromoCarousel";
import { getProducts } from "@/lib/skating-store/supabase-queries";
import { getBanners, getCategories } from "@/lib/skating-store/content-actions";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, banners, categories] = await Promise.all([
    getProducts(),
    getBanners(true), // Fetch only active banners
    getCategories()
  ]);
  
  const featuredProducts = products.filter(p => p.featured).slice(0, 4);

  return (
    <div className="flex flex-col">
      {banners.length > 0 ? (
        <PromoCarousel banners={banners} />
      ) : (
        <HeroSection />
      )}
      <FeaturedProducts products={featuredProducts} />
      <CategoryShowcase categories={categories} />
    </div>
  );
}
