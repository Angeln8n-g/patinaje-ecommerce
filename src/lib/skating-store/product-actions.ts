"use server";

import { Product } from "@/types/skating-store";
import { cookies } from "next/headers";

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

export async function createProduct(data: Omit<Product, "id" | "created_at" | "updated_at"> & { store_id?: string }) {
  return authServerFetch("/api/products", { method: "POST", body: data });
}

export async function bulkCreateProducts(products: Record<string, any>[], storeId?: string) {
  return authServerFetch("/api/products/bulk", { method: "POST", body: { products, store_id: storeId } });
}

export async function updateProduct(id: string, data: Partial<Product>) {
  return authServerFetch(`/api/products/${id}`, { method: "PUT", body: data });
}

export async function deleteProduct(id: string) {
  return authServerFetch(`/api/products/${id}`, { method: "DELETE" });
}
