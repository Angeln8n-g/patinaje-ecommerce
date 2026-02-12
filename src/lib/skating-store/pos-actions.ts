"use server";

import { cookies } from "next/headers";
import {
  PosSession,
  CashSessionSummary,
  POSCartItem,
  PaymentInfo,
  Order,
  Product,
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

export async function openCashSession(initialAmount: number): Promise<PosSession> {
  return apiFetch("/api/pos/sessions", { method: "POST", body: { initial_amount: initialAmount } });
}

export async function closeCashSession(sessionId: string, reportedAmount: number): Promise<CashSessionSummary> {
  const session = await apiFetch(`/api/pos/sessions/${sessionId}/close`, { method: "PUT", body: { reported_amount: reportedAmount } });
  const expectedAmount = Number(session.initial_amount) + Number(session.total_cash_sales);
  return {
    total_sales: Number(session.total_sales),
    total_card_sales: Number(session.total_card_sales),
    total_cash_sales: Number(session.total_cash_sales),
    transaction_count: Number(session.transaction_count),
    expected_amount: expectedAmount,
    reported_amount: reportedAmount,
    difference: reportedAmount - expectedAmount,
  };
}

export async function createPOSOrder(
  items: POSCartItem[],
  payment: PaymentInfo,
  customerName: string,
  customerPhone?: string
): Promise<Order> {
  const result = await apiFetch("/api/orders/pos", {
    method: "POST",
    body: { items, payment, customer_name: customerName, customer_phone: customerPhone },
  });
  return mapDbOrderToOrder(result);
}

export async function searchProductsForPOS(queryStr: string): Promise<Product[]> {
  if (!queryStr || queryStr.trim() === "") return [];
  try {
    return await apiFetch("/api/products/search-pos?q=" + encodeURIComponent(queryStr.trim()));
  } catch { return []; }
}

export async function getActiveSession(): Promise<PosSession | null> {
  try { return await apiFetch("/api/pos/sessions/active"); } catch { return null; }
}

export async function createProductExchange(
  orderId: string,
  originalProductId: string,
  originalQuantity: number,
  newProductId: string,
  newQuantity: number,
  justification: string
): Promise<void> {
  await apiFetch(`/api/orders/${orderId}/exchange`, {
    method: "POST",
    body: { original_product_id: originalProductId, original_quantity: originalQuantity, new_product_id: newProductId, new_quantity: newQuantity, justification },
  });
}
