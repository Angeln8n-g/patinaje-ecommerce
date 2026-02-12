"use server";

import { UserRole } from "@/types/skating-store";
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

export async function getUsers() {
  try { return await apiFetch("/api/users"); } catch { return []; }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  await apiFetch(`/api/users/${userId}/role`, { method: "PUT", body: { role: newRole } });
  return { success: true };
}

export async function getSellers() {
  try { return await apiFetch("/api/users/sellers"); } catch { return []; }
}

export async function toggleSellerRole(userId: string, active: boolean) {
  const newRole: UserRole = active ? "SELLER" : "USER";
  await apiFetch(`/api/users/${userId}/role`, { method: "PUT", body: { role: newRole } });
  return { success: true };
}

export async function getNonSellerUsers() {
  try { return await apiFetch("/api/users/non-sellers"); } catch { return []; }
}
