"use server";

import { cookies } from "next/headers";
import { SellerDashboardStats, OrderFilters, Order } from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";

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

export async function getSellerDashboardStats(): Promise<SellerDashboardStats> {
  try { return await apiFetch("/api/users/seller/dashboard"); }
  catch { return { today_sales: 0, today_orders_completed: 0, pending_orders: 0 }; }
}

export async function getSellerOrders(filters?: OrderFilters): Promise<Order[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    const data = await apiFetch(`/api/orders/seller${qs ? "?" + qs : ""}`);
    return (data || []).map((dbOrder: any) => ({
      ...mapDbOrderToOrder(dbOrder),
      seller_id: dbOrder.seller_id,
      order_type: dbOrder.order_type,
      dispatched_at: dbOrder.dispatched_at,
      shipment: dbOrder.shipment || null,
    }));
  } catch { return []; }
}

export async function markOrderAsDispatched(orderId: string): Promise<void> {
  await apiFetch(`/api/orders/${orderId}`, {
    method: "PUT",
    body: { status: "delivered", dispatched_at: new Date().toISOString() },
  });
}

export async function getMyStoreProducts(): Promise<any[]> {
  try {
    // First get seller's store
    const store = await apiFetch("/api/stores/my/store");
    if (!store?.id) return [];
    // Get store inventory (products with store-level stock)
    return await apiFetch(`/api/stores/${store.id}/inventory`);
  } catch { return []; }
}

export async function getMyStoreInventoryMovements(): Promise<any[]> {
  try {
    const store = await apiFetch("/api/stores/my/store");
    if (!store?.id) return [];
    return await apiFetch(`/api/inventory?store_id=${store.id}`);
  } catch { return []; }
}

export async function getMyStore(): Promise<any | null> {
  try { return await apiFetch("/api/stores/my/store"); }
  catch { return null; }
}
