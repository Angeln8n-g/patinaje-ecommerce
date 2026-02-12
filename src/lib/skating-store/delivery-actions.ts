"use server";

import { cookies } from "next/headers";
import { Shipment, ShipmentStatus, DeliveryLocation } from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";
import { sendOrderNotification } from "./notification-actions";
import { createInAppNotification } from "./in-app-notifications";
import { haversineDistance } from "./geo-utils";

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

export async function assignShipment(orderId: string, deliveryManId: string) {
  const result = await apiFetch("/api/delivery/shipments", {
    method: "POST",
    body: { order_id: orderId, delivery_man_id: deliveryManId },
  });

  // Send notifications
  try {
    const order = await apiFetch(`/api/orders/${orderId}`);
    if (order && order.user_id) {
      const deliveryProfile = await apiFetch(`/api/users`).then((users: any[]) =>
        users.find((u: any) => u.id === deliveryManId)
      ).catch(() => null);
      const deliveryName = deliveryProfile
        ? [deliveryProfile.first_name, deliveryProfile.last_name].filter(Boolean).join(" ") || "Un repartidor"
        : "Un repartidor";

      await createInAppNotification({
        user_id: order.user_id, order_id: orderId,
        title: "¡Repartidor Asignado!",
        message: `${deliveryName} ha sido asignado para entregar tu pedido.`,
        type: "info",
      });
      if (order.customer_email) {
        await sendOrderNotification({
          orderId, customerName: order.customer_name, customerEmail: order.customer_email,
          status: "ASIGNADO", deliveryName, deliveryRating: 4.9,
        });
      }
    }
  } catch (e) { console.error("Notification error:", e); }

  return { success: true };
}

export async function updateShipmentStatus(shipmentId: string, status: ShipmentStatus, lat?: number, lng?: number) {
  const result = await apiFetch(`/api/delivery/shipments/${shipmentId}`, {
    method: "PUT",
    body: { status, current_lat: lat, current_lng: lng },
  });

  // Send notifications for status changes
  if (status === "EN_RUTA" || status === "CERCA" || status === "ENTREGADO") {
    try {
      if (result?.order_id) {
        const order = await apiFetch(`/api/orders/${result.order_id}`);
        if (order?.user_id) {
          let title = "", message = "", type: "info" | "success" | "warning" = "info";
          if (status === "EN_RUTA") { title = "¡Tu pedido va en camino!"; message = "El repartidor ha iniciado el viaje hacia tu ubicación."; }
          else if (status === "CERCA") { title = "¡Repartidor Cerca!"; message = "El repartidor está muy cerca de tu dirección."; type = "warning"; }
          else if (status === "ENTREGADO") { title = "¡Pedido Entregado!"; message = "Tu pedido ha sido entregado exitosamente. ¡Gracias por tu compra!"; type = "success"; }
          await createInAppNotification({ user_id: order.user_id, order_id: order.id, title, message, type });
          if (order.customer_email) {
            await sendOrderNotification({ orderId: order.id, customerName: order.customer_name, customerEmail: order.customer_email, status });
          }
        }
      }
    } catch (e) { console.error("Notification error:", e); }
  }
  return { success: true };
}

export async function updateDeliveryLocation(shipmentId: string, lat: number, lng: number) {
  try {
    await apiFetch(`/api/delivery/shipments/${shipmentId}`, {
      method: "PUT", body: { current_lat: lat, current_lng: lng },
    });
    return { success: true };
  } catch { return { success: false }; }
}

export async function getDeliveryShipments() {
  try {
    const data = await apiFetch("/api/delivery/shipments/active");
    return (data || []).map((s: any) => ({ ...s, order: s.order ? mapDbOrderToOrder(s.order) : null }));
  } catch { return []; }
}

export async function getDeliveryHistory() {
  try {
    const data = await apiFetch("/api/delivery/shipments/history");
    return (data || []).map((s: any) => ({ ...s, order: s.order ? mapDbOrderToOrder(s.order) : null }));
  } catch { return []; }
}

export async function getAllDeliveryMen() {
  try { return await apiFetch("/api/delivery/men"); } catch { return []; }
}

export async function getDeliveryMenStats() {
  try { return await apiFetch("/api/delivery/men/stats"); } catch { return []; }
}

export async function getAllOrdersWithShipment() {
  try {
    const data = await apiFetch("/api/orders/with-shipments");
    return (data || []).map((o: any) => ({ ...mapDbOrderToOrder(o), shipment: o.shipment || null }));
  } catch { return []; }
}

export async function updateDeliveryManLocation(lat: number, lng: number): Promise<{ success: boolean }> {
  try {
    await apiFetch("/api/delivery/location", { method: "PUT", body: { lat, lng } });
    return { success: true };
  } catch { return { success: false }; }
}

export async function getDeliveryMenLocations(): Promise<
  Array<DeliveryLocation & { first_name: string | null; last_name: string | null; email: string }>
> {
  try {
    const data = await apiFetch("/api/delivery/locations");
    return (data || []).map((row: any) => ({
      id: row.id, delivery_man_id: row.delivery_man_id,
      lat: Number(row.lat), lng: Number(row.lng), updated_at: row.updated_at,
      first_name: row.first_name ?? null, last_name: row.last_name ?? null, email: row.email ?? "",
    }));
  } catch { return []; }
}

export async function getNearestDeliveryMen(storeLat: number, storeLng: number) {
  try {
    const locations = await getDeliveryMenLocations();
    return locations.map((loc) => ({
      ...loc,
      distance_km: haversineDistance(storeLat, storeLng, loc.lat, loc.lng),
    })).sort((a, b) => a.distance_km - b.distance_km);
  } catch { return []; }
}
