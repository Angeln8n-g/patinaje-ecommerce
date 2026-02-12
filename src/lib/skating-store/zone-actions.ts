"use server";

import { cookies } from "next/headers";
import { DeliveryZone, StoreLocation } from "@/types/skating-store";
import { validateCoordinates, isPointInPolygon } from "./geo-utils";

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

export async function getStoreLocation(): Promise<StoreLocation | null> {
  try {
    const data = await apiFetch("/api/content/static/store-location");
    if (!data?.data) return null;
    return data.data as StoreLocation;
  } catch { return null; }
}

export async function saveStoreLocation(lat: number, lng: number, address: string) {
  const validation = validateCoordinates(lat, lng);
  if (!validation.valid) return { success: false as const, error: validation.error };
  await apiFetch("/api/content/static/store-location", { method: "PUT", body: { data: { lat, lng, address } } });
  return { success: true as const };
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  try { return await apiFetch("/api/delivery/zones"); } catch { return []; }
}

export async function createDeliveryZone(name: string, polygon: Array<{ lat: number; lng: number }>) {
  if (!name?.trim()) return { success: false as const, error: "El nombre de la zona es requerido" };
  if (!polygon || polygon.length < 3) return { success: false as const, error: "El polígono debe tener al menos 3 vértices" };
  const data = await apiFetch("/api/delivery/zones", { method: "POST", body: { name: name.trim(), polygon, is_active: true } });
  return { success: true as const, data: data as DeliveryZone };
}

export async function updateDeliveryZone(id: string, updates: { name?: string; polygon?: Array<{ lat: number; lng: number }> }) {
  if (updates.name !== undefined && !updates.name.trim()) return { success: false as const, error: "El nombre de la zona es requerido" };
  if (updates.polygon !== undefined && updates.polygon.length < 3) return { success: false as const, error: "El polígono debe tener al menos 3 vértices" };
  await apiFetch(`/api/delivery/zones/${id}`, { method: "PUT", body: updates });
  return { success: true as const };
}

export async function deleteDeliveryZone(id: string) {
  await apiFetch(`/api/delivery/zones/${id}`, { method: "DELETE" });
  return { success: true as const };
}

export async function toggleDeliveryZone(id: string, isActive: boolean) {
  await apiFetch(`/api/delivery/zones/${id}`, { method: "PUT", body: { is_active: isActive } });
  return { success: true as const };
}

export async function validateDeliveryZone(lat: number, lng: number) {
  try {
    const zones = await apiFetch("/api/delivery/zones");
    const activeZones = (zones || []).filter((z: DeliveryZone) => z.is_active);
    if (activeZones.length === 0) return { inZone: false as const };
    const point = { lat, lng };
    for (const zone of activeZones) {
      const polygon = typeof zone.polygon === "string" ? JSON.parse(zone.polygon) : zone.polygon;
      if (isPointInPolygon(point, polygon)) return { inZone: true as const, zoneName: zone.name };
    }
    return { inZone: false as const };
  } catch { return { inZone: false as const }; }
}
