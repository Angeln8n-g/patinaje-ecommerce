import { authFetch } from "@/lib/api/client";

interface CancelOrderParams {
  reasonCode: string;
  reasonDescription?: string;
}

interface CancelOrderResult {
  success: boolean;
  order: any;
  cancellation: any;
  inventoryRestored: boolean;
  notificationsSent: number;
}

/**
 * Cancel an order as a user via POST /api/orders/:id/cancel
 */
export async function cancelUserOrder(
  orderId: string,
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  return authFetch<CancelOrderResult>(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    body: {
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
    },
  });
}

/**
 * Cancel an order as a delivery person via POST /api/cancellations/delivery/:orderId
 */
export async function cancelDeliveryOrder(
  orderId: string,
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  return authFetch<CancelOrderResult>(`/api/cancellations/delivery/${orderId}`, {
    method: "POST",
    body: {
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
    },
  });
}

/**
 * Cancel an order as a seller via POST /api/cancellations/seller/:orderId
 */
export async function cancelSellerOrder(
  orderId: string,
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  return authFetch<CancelOrderResult>(`/api/cancellations/seller/${orderId}`, {
    method: "POST",
    body: {
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
    },
  });
}


// --- Admin cancellation functions ---

export interface CancellationFilters {
  role?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface CancellationRecord {
  id: string;
  order_id: string;
  cancelled_by: string;
  cancelled_by_role: string;
  reason_code: string;
  reason_description: string | null;
  created_at: string;
  cancelled_by_name: string;
  customer_name: string;
  total: number;
  order_status: string;
}

export interface CancellationsResponse {
  data: CancellationRecord[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get cancellations list with filters via GET /api/cancellations (admin only)
 */
export async function getCancellations(
  filters: CancellationFilters = {}
): Promise<CancellationsResponse> {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));

  const qs = params.toString();
  return authFetch<CancellationsResponse>(`/api/cancellations${qs ? `?${qs}` : ""}`);
}

/**
 * Cancel any order as admin via POST /api/cancellations/admin/:orderId
 */
export async function cancelAdminOrder(
  orderId: string,
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  return authFetch<CancelOrderResult>(`/api/cancellations/admin/${orderId}`, {
    method: "POST",
    body: {
      reasonCode: params.reasonCode,
      reasonDescription: params.reasonDescription,
    },
  });
}
