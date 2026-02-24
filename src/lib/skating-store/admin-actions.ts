"use server";

import { cookies } from "next/headers";
import {
  Order,
  DateRange,
  SellerStat,
  DeliveryStat,
  SalesComparison,
} from "@/types/skating-store";
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

export async function getAdminDashboardStats() {
  try { return await apiFetch("/api/users/admin/dashboard"); }
  catch { return { totalSales: 0, activeOrdersCount: 0, productsCount: 0, usersCount: 0, recentSales: [] }; }
}

export async function getSellerStats(dateRange?: DateRange): Promise<SellerStat[]> {
  try {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set("from", dateRange.from);
    if (dateRange?.to) params.set("to", dateRange.to);
    const qs = params.toString();
    return await apiFetch(`/api/users/admin/seller-stats${qs ? "?" + qs : ""}`);
  } catch { return []; }
}

export async function getDeliveryStats(dateRange?: DateRange): Promise<DeliveryStat[]> {
  try {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set("from", dateRange.from);
    if (dateRange?.to) params.set("to", dateRange.to);
    const qs = params.toString();
    return await apiFetch(`/api/users/admin/delivery-stats${qs ? "?" + qs : ""}`);
  } catch { return []; }
}

export async function getSalesComparison(dateRange?: DateRange): Promise<SalesComparison> {
  try {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set("from", dateRange.from);
    if (dateRange?.to) params.set("to", dateRange.to);
    const qs = params.toString();
    return await apiFetch(`/api/users/admin/sales-comparison${qs ? "?" + qs : ""}`);
  } catch {
    return { in_store_sales: 0, in_store_amount: 0, online_sales: 0, online_amount: 0, total_sales: 0, total_amount: 0 };
  }
}

export interface StoreStat {
  store_id: string;
  store_name: string;
  color: string;
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  seller_count: number;
}

export async function getStoreStats(dateRange?: DateRange): Promise<StoreStat[]> {
  try {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set("from", dateRange.from);
    if (dateRange?.to) params.set("to", dateRange.to);
    const qs = params.toString();
    return await apiFetch(`/api/users/admin/store-stats${qs ? "?" + qs : ""}`);
  } catch { return []; }
}

export async function assignOrderToSeller(orderId: string, sellerId: string): Promise<void> {
  await apiFetch(`/api/orders/${orderId}`, {
    method: "PUT",
    body: { seller_id: sellerId, status: "asignado_vendedor" },
  });
}

export async function getSellerOrdersAdmin(sellerId: string): Promise<Order[]> {
  try {
    const orders = await apiFetch("/api/orders");
    return (orders || []).filter((o: any) => o.seller_id === sellerId).map(mapDbOrderToOrder);
  } catch { return []; }
}
