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

export interface InAppNotification {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
}

export async function createInAppNotification(notification: Omit<InAppNotification, "id" | "created_at" | "is_read">) {
  try {
    await apiFetch("/api/notifications", { method: "POST", body: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function getUserNotifications(userId: string) {
  try { return await apiFetch("/api/notifications"); } catch { return []; }
}

export async function markNotificationAsRead(notificationId: string) {
  await apiFetch(`/api/notifications/${notificationId}/read`, { method: "PUT" });
}

export async function markAllNotificationsAsRead(userId: string) {
  await apiFetch("/api/notifications/read-all", { method: "PUT" });
}
