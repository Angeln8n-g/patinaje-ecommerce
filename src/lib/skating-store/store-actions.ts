"use server";

import { cookies } from "next/headers";
import { Store } from "@/types/skating-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

async function apiFetch(endpoint: string, options: { method?: string; body?: any } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("skating_token")?.value || null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function getStores(): Promise<Store[]> {
  try { return await apiFetch("/api/stores"); } catch { return []; }
}

export async function getStoreById(id: string): Promise<Store | null> {
  try { return await apiFetch(`/api/stores/${id}`); } catch { return null; }
}

export async function createStore(data: { name: string; address?: string; lat?: number; lng?: number; color?: string }) {
  return apiFetch("/api/stores", { method: "POST", body: data });
}

export async function updateStore(id: string, data: Partial<Store>) {
  return apiFetch(`/api/stores/${id}`, { method: "PUT", body: data });
}

export async function deleteStore(id: string) {
  return apiFetch(`/api/stores/${id}`, { method: "DELETE" });
}

export async function assignSellerToStore(storeId: string, sellerId: string) {
  return apiFetch(`/api/stores/${storeId}/sellers`, { method: "POST", body: { seller_id: sellerId } });
}

export async function removeSellerFromStore(storeId: string, sellerId: string) {
  return apiFetch(`/api/stores/${storeId}/sellers/${sellerId}`, { method: "DELETE" });
}

export async function assignZoneToStore(storeId: string, zoneId: string) {
  return apiFetch(`/api/stores/${storeId}/zones`, { method: "POST", body: { zone_id: zoneId } });
}

export async function removeZoneFromStore(storeId: string, zoneId: string) {
  return apiFetch(`/api/stores/${storeId}/zones/${zoneId}`, { method: "DELETE" });
}

export async function getMyStore(): Promise<Store | null> {
  try { return await apiFetch("/api/stores/my/store"); } catch { return null; }
}

export async function updateStoreLocation(storeId: string, lat: number, lng: number, address?: string) {
  return apiFetch(`/api/stores/${storeId}/location`, { method: "PUT", body: { lat, lng, address } });
}

export async function updateStoreShippingConfig(storeId: string, shippingConfig: any) {
  return apiFetch(`/api/stores/${storeId}/shipping-config`, { method: "PUT", body: { shipping_config: shippingConfig } });
}
