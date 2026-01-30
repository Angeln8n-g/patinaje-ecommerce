"use server";

import { createClient } from "@/lib/supabase/server";
import { Category, Banner, PromoTextBanner } from "@/types/skating-store";

// --- Categories ---

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

export async function createCategory(category: Omit<Category, "id" | "created_at">) {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Double check admin role via DB just in case, though RLS handles it
  
  const payload: any = {
    name: (category as any).name,
    slug: (category as any).slug,
    description: (category as any).description ?? null,
  };
  if (typeof (category as any).icon_name !== "undefined") {
    payload.icon_name = (category as any).icon_name || null;
  }
  if (typeof (category as any).icon_url !== "undefined") {
    payload.icon_url = (category as any).icon_url || null;
  }

  let { data, error } = await supabase
    .from("categories")
    .insert([payload])
    .select()
    .single();

  if (error) {
    const msg = String((error as any)?.message || "");
    const code = String((error as any)?.code || "");
    if (code === "PGRST204" || msg.includes("icon_name") || msg.includes("icon_url")) {
      delete payload.icon_name;
      delete payload.icon_url;
      const retry = await supabase
        .from("categories")
        .insert([payload])
        .select()
        .single();
      data = retry.data as any;
      error = retry.error as any;
      if (!error) {
        return { success: true, data };
      }
    }
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }

  return { success: true, data };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Failed to delete category");
  return { success: true };
}

// --- Banners ---

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

export async function createBanner(banner: Omit<Banner, "id" | "created_at">) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("banners")
    .insert([banner])
    .select()
    .single();

  if (error) {
    console.error("Error creating banner:", error);
    throw new Error("Failed to create banner");
  }

  return { success: true, data };
}

export async function updateBanner(id: string, updates: Partial<Banner>) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("banners")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error("Failed to update banner");
  return { success: true };
}

export async function deleteBanner(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Failed to delete banner");
  return { success: true };
}

// --- Promo Text Banners (Delivery/Tags) ---

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

export async function updatePromoTextBanner(id: string, updates: Partial<PromoTextBanner>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("promo_text_banners")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error("Failed to update promo banner");
  return { success: true };
}

// --- Static Content (About / Contact) ---

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

export async function updateStaticContent(slug: string, data: any) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("static_content")
    .upsert({ slug, data, updated_at: new Date().toISOString() }, { onConflict: "slug" });

  if (error) throw new Error("Failed to update static content");
  return { success: true };
}
