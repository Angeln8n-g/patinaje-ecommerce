import { serverFetch } from "@/lib/api/server";
import { Category, Banner, PromoTextBanner } from "@/types/skating-store";

export async function getCategories(): Promise<Category[]> {
  try {
    return await serverFetch<Category[]>("/api/content/categories");
  } catch {
    return [];
  }
}

export async function getBanners(activeOnly = false): Promise<Banner[]> {
  try {
    const qs = activeOnly ? "?active=true" : "";
    return await serverFetch<Banner[]>(`/api/content/banners${qs}`);
  } catch {
    return [];
  }
}

export async function getBannersByCategory(categorySlug: string): Promise<Banner[]> {
  try {
    return await serverFetch<Banner[]>(`/api/content/banners?category=${categorySlug}&active=true`);
  } catch {
    return [];
  }
}

export async function getActivePromoTextBanner(): Promise<PromoTextBanner | null> {
  try {
    const banners = await serverFetch<PromoTextBanner[]>("/api/content/promo-banners?active=true");
    return banners.length > 0 ? banners[0] : null;
  } catch {
    return null;
  }
}

export async function getStaticContent(slug: string) {
  try {
    return await serverFetch(`/api/content/static/${slug}`);
  } catch {
    return null;
  }
}
