const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (token) {
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${endpoint}`, config);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// Token management for client-side
const TOKEN_KEY = "skating_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Authenticated fetch helper
export async function authFetch<T = any>(
  endpoint: string,
  options: Omit<RequestOptions, "token"> = {}
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, token: getToken() });
}
