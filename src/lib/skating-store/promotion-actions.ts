"use server";

import { cookies } from "next/headers";
import { Banner, PromoWaitlistEntry } from "@/types/skating-store";

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

// Public: Subscribe to waitlist
export async function subscribeToWaitlist(bannerId: string, email: string, name?: string) {
  const res = await fetch(`${API_URL}/api/promotions/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ banner_id: bannerId, email, name }),
  });
  return res.json();
}

// Public: Check subscription
export async function checkWaitlistSubscription(bannerId: string, email: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/api/promotions/waitlist/check?banner_id=${bannerId}&email=${email}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return data.subscribed;
  } catch {
    return false;
  }
}

// Admin: Get all promos
export async function getPromotions(): Promise<Banner[]> {
  return authServerFetch("/api/promotions");
}

// Admin: Get waitlist for a banner
export async function getPromoWaitlist(bannerId: string): Promise<PromoWaitlistEntry[]> {
  return authServerFetch(`/api/promotions/waitlist/${bannerId}`);
}

// Admin: Activate promo and send emails
export async function activatePromotion(bannerId: string) {
  return authServerFetch(`/api/promotions/${bannerId}/activate`, { method: "PUT" });
}

// Admin: Update promo status
export async function updatePromoStatus(bannerId: string, data: {
  promo_status?: string;
  promo_start_date?: string;
  promo_end_date?: string;
}) {
  return authServerFetch(`/api/promotions/${bannerId}/status`, { method: "PUT", body: data });
}
