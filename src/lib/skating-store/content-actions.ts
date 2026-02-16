"use server";

import { cookies } from "next/headers";
import { Category, Banner, PromoTextBanner } from "@/types/skating-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("skating_token")?.value || null;
}

async function authServerFetch(endpoint: string, options: { method?: string; body?: any } = {}) {
  const token = await getServerToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// Categories
export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/categories`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

export async function createCategory(category: Omit<Category, "id" | "created_at">) {
  return authServerFetch("/api/content/categories", { method: "POST", body: category });
}

export async function deleteCategory(id: string) {
  return authServerFetch(`/api/content/categories/${id}`, { method: "DELETE" });
}

// Banners
export async function getBanners(activeOnly = false): Promise<Banner[]> {
  try {
    if (activeOnly) {
      const res = await fetch(`${API_URL}/api/content/banners?active=true`, { cache: "no-store" });
      return res.ok ? res.json() : [];
    }
    // Admin listing: use authenticated fetch to get banners with associated categories
    return await authServerFetch("/api/content/banners");
  } catch { return []; }
}

export async function createBanner(banner: Omit<Banner, "id" | "created_at">) {
  const { categories, ...payload } = banner;
  return authServerFetch("/api/content/banners", { method: "POST", body: payload });
}

export async function updateBanner(id: string, updates: Partial<Banner>) {
  const { categories, ...payload } = updates;
  return authServerFetch(`/api/content/banners/${id}`, { method: "PUT", body: payload });
}

export async function deleteBanner(id: string) {
  return authServerFetch(`/api/content/banners/${id}`, { method: "DELETE" });
}

// Promo Text Banners
export async function getPromoTextBanners(activeOnly = false): Promise<PromoTextBanner[]> {
  try {
    const qs = activeOnly ? "?active=true" : "";
    const res = await fetch(`${API_URL}/api/content/promo-banners${qs}`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

export async function getActivePromoTextBanner() {
  const banners = await getPromoTextBanners(true);
  return banners.length > 0 ? banners[0] : null;
}

export async function updatePromoTextBanner(id: string, updates: Partial<PromoTextBanner>) {
  return authServerFetch(`/api/content/promo-banners/${id}`, { method: "PUT", body: updates });
}

// Static Content
export async function getStaticContent(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/content/static/${slug}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export async function updateStaticContent(slug: string, data: any) {
  return authServerFetch(`/api/content/static/${slug}`, { method: "PUT", body: { data } });
}
