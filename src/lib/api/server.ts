// Server-side API client for Server Components
// No auth needed for public endpoints

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.hunykho.com";

export async function serverFetch<T = any>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.error(`[serverFetch] ${endpoint} failed:`, res.status, res.statusText);
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}
