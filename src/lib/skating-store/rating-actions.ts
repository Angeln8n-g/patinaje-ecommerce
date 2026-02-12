"use server";

import { cookies } from "next/headers";

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

export interface DeliveryRating {
  id: string;
  order_id: string;
  delivery_man_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export async function submitDeliveryRating(orderId: string, rating: number, comment: string) {
  await apiFetch("/api/delivery/ratings", { method: "POST", body: { order_id: orderId, rating, comment } });
  return { success: true };
}

export async function getDeliveryManStats(deliveryManId: string) {
  try { return await apiFetch(`/api/delivery/ratings/stats/${deliveryManId}`); }
  catch { return null; }
}

export async function getOrderRating(orderId: string) {
  try { return await apiFetch(`/api/delivery/ratings/${orderId}`); }
  catch { return null; }
}
