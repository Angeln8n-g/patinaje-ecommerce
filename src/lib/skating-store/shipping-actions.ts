"use server";

import { cookies } from "next/headers";
import { ShippingConfig } from "@/types/skating-store";
import { validateShippingConfig, haversineDistance, validateCoordinates, computeShippingCost } from "./geo-utils";
import { getStoreLocation } from "./zone-actions";

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

export async function getShippingConfig(): Promise<ShippingConfig | null> {
  try {
    const data = await apiFetch("/api/content/static/shipping-config");
    if (!data?.data) return null;
    return data.data as ShippingConfig;
  } catch { return null; }
}

export async function saveShippingConfig(config: ShippingConfig) {
  const validation = validateShippingConfig(config);
  if (!validation.valid) return { success: false as const, error: validation.error };
  await apiFetch("/api/content/static/shipping-config", { method: "PUT", body: { data: config } });
  return { success: true as const };
}

export async function calculateShippingCost(customerLat: number, customerLng: number) {
  // Validate customer coordinates
  const coordValidation = validateCoordinates(customerLat, customerLng);
  if (!coordValidation.valid) {
    return { success: false as const, error: coordValidation.error };
  }

  // Get store location
  const storeLocation = await getStoreLocation();
  if (!storeLocation) {
    return { success: false as const, error: "La tienda no tiene una ubicación configurada" };
  }

  // Get shipping configuration
  const shippingConfig = await getShippingConfig();
  if (!shippingConfig) {
    return { success: false as const, error: "La configuración de envío no está definida" };
  }

  // Calculate distance using haversine formula
  const distanceKm = haversineDistance(
    storeLocation.lat,
    storeLocation.lng,
    customerLat,
    customerLng
  );

  // Compute shipping cost
  const result = computeShippingCost(distanceKm, shippingConfig);

  return { success: true as const, data: result };
}
