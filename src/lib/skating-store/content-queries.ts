import { createClient } from "@/lib/supabase/server";
import { Category, Banner, PromoTextBanner } from "@/types/skating-store";

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data as Category[];
}

export async function getBanners(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching banners:", error);
    return [];
  }
  return data as Banner[];
}

export async function getPromoTextBanners(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase
    .from("promo_text_banners")
    .select("*")
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching promo banners:", error);
    return [];
  }
  return data as PromoTextBanner[];
}

export async function getActivePromoTextBanner() {
  const banners = await getPromoTextBanners(true);
  return banners.length > 0 ? banners[0] : null;
}

export async function getStaticContent(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("static_content")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching static content ${slug}:`, error);
    return null;
  }
  return data;
}
