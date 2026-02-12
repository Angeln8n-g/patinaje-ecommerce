import { serverFetch } from "@/lib/api/server";
import { Product } from "@/types/skating-store";

export async function getProductByIdServer(id: string): Promise<Product | null> {
  try {
    return await serverFetch<Product>(`/api/products/${id}`);
  } catch {
    return null;
  }
}

export async function getProductsServer(): Promise<Product[]> {
  try {
    return await serverFetch<Product[]>("/api/products");
  } catch {
    return [];
  }
}

export async function getProductsFilteredServer(
  category?: string | null,
  search?: string | null
): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    return await serverFetch<Product[]>(`/api/products${qs ? `?${qs}` : ""}`);
  } catch {
    return [];
  }
}

export async function getProductReviewsServer(productId: string) {
  try {
    return await serverFetch(`/api/reviews/${productId}`);
  } catch {
    return [];
  }
}
