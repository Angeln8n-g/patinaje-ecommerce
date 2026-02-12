"use server";

import { CartItem } from "@/types/skating-store";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

async function getServerToken() {
  const cookieStore = await cookies();
  return cookieStore.get("skating_token")?.value || null;
}

async function apiFetch(endpoint: string, options: { method?: string; body?: any } = {}) {
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

export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    return await apiFetch("/api/cart");
  } catch { return []; }
}

export async function addToCart(userId: string, productId: string, quantity: number, variant?: string) {
  try {
    await apiFetch("/api/cart", {
      method: "POST",
      body: { product_id: productId, quantity, selected_variant: variant },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCartItemQuantity(userId: string, productId: string, quantity: number) {
  try {
    await apiFetch(`/api/cart/${productId}`, { method: "PUT", body: { quantity } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeFromCart(userId: string, productId: string) {
  try {
    await apiFetch(`/api/cart/${productId}`, { method: "DELETE" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function clearCart(userId: string) {
  try {
    await apiFetch("/api/cart", { method: "DELETE" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
