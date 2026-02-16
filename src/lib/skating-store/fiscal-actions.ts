import { authFetch } from "@/lib/api/client";

// Dashboard
export async function getFiscalDashboard() {
  return authFetch("/api/fiscal/dashboard");
}

// Invoices
export async function getFiscalInvoices(params?: {
  page?: number;
  limit?: number;
  estado?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.estado) query.set("estado", params.estado);
  if (params?.tipo) query.set("tipo", params.tipo);
  if (params?.desde) query.set("desde", params.desde);
  if (params?.hasta) query.set("hasta", params.hasta);
  const qs = query.toString();
  return authFetch(`/api/fiscal/invoices${qs ? `?${qs}` : ""}`);
}

export async function getFiscalInvoice(id: string) {
  return authFetch(`/api/fiscal/invoices/${id}`);
}

export async function createFiscalInvoice(data: {
  order_id: string;
  tipo_comprobante: string;
  comprador_rnc?: string;
  comprador_nombre: string;
  comprador_tipo: string;
}) {
  return authFetch("/api/fiscal/invoices", { method: "POST", body: data });
}

export async function annulFiscalInvoice(id: string, motivo: string) {
  return authFetch(`/api/fiscal/invoices/${id}/annul`, { method: "POST", body: { motivo } });
}

export async function resendFiscalInvoice(id: string) {
  return authFetch(`/api/fiscal/invoices/${id}/resend`, { method: "POST" });
}

export async function ackFiscalInvoice(id: string) {
  return authFetch(`/api/fiscal/invoices/${id}/ack`, { method: "POST" });
}

export async function approveFiscalInvoice(id: string) {
  return authFetch(`/api/fiscal/invoices/${id}/approval`, { method: "POST" });
}

export async function getFiscalInvoicePdf(id: string): Promise<Blob> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("skating_token") : null;
  const res = await fetch(`${API_URL}/api/fiscal/invoices/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Error al descargar PDF");
  return res.blob();
}

// Config
export async function getFiscalConfig() {
  return authFetch("/api/fiscal/config");
}

export async function updateFiscalConfig(data: Record<string, unknown>) {
  return authFetch("/api/fiscal/config", { method: "PUT", body: data });
}

export async function uploadFiscalCertificate(formData: FormData): Promise<any> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("skating_token") : null;
  const res = await fetch(`${API_URL}/api/fiscal/config/certificate`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error al cargar certificado");
  }
  return res.json();
}

export async function getFiscalConfigHistory() {
  return authFetch("/api/fiscal/config/history");
}

// Sequences
export async function getFiscalSequences() {
  return authFetch("/api/fiscal/sequences");
}

export async function createFiscalSequence(data: {
  tipo_comprobante: string;
  prefijo: string;
  rango_inicial: number;
  rango_final: number;
  fecha_vencimiento: string;
}) {
  return authFetch("/api/fiscal/sequences", { method: "POST", body: data });
}

export async function getFiscalSequencesStatus() {
  return authFetch("/api/fiscal/sequences/status");
}

// Audit log
export async function getFiscalAuditLog(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return authFetch(`/api/fiscal/audit-log${qs ? `?${qs}` : ""}`);
}
