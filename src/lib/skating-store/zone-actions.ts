"use server";

import { createClient } from "@/lib/supabase/server";
import { DeliveryZone, StoreLocation } from "@/types/skating-store";
import { validateCoordinates, isPointInPolygon } from "./geo-utils";

// ─── Store Location ─────────────────────────────────────────────────────────

/**
 * Retrieves the store location from the `static_content` table (slug: "store-location").
 *
 * @returns The store location or `null` if not configured.
 */
export async function getStoreLocation(): Promise<StoreLocation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("static_content")
    .select("data")
    .eq("slug", "store-location")
    .single();

  if (error) {
    console.error("Error fetching store location:", error);
    return null;
  }

  if (!data?.data) return null;

  return data.data as StoreLocation;
}

/**
 * Saves (upserts) the store location in the `static_content` table.
 * Validates coordinates before persisting.
 *
 * @returns `{ success: true }` on success, or throws / returns an error object.
 */
export async function saveStoreLocation(
  lat: number,
  lng: number,
  address: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Validate coordinates before saving
  const validation = validateCoordinates(lat, lng);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const storeLocation: StoreLocation = { lat, lng, address };

  const { error } = await supabase
    .from("static_content")
    .upsert(
      {
        slug: "store-location",
        data: storeLocation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

  if (error) {
    console.error("Error saving store location:", error);
    throw new Error("Failed to save store location");
  }

  return { success: true };
}

// ─── Delivery Zones ─────────────────────────────────────────────────────────

/**
 * Retrieves all delivery zones, ordered by creation date (newest first).
 */
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching delivery zones:", error);
    return [];
  }

  return data as DeliveryZone[];
}

/**
 * Creates a new delivery zone.
 *
 * @param name    - Display name for the zone.
 * @param polygon - Array of vertices (at least 3) defining the zone polygon.
 */
export async function createDeliveryZone(
  name: string,
  polygon: Array<{ lat: number; lng: number }>
): Promise<{ success: true; data: DeliveryZone } | { success: false; error: string }> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "El nombre de la zona es requerido" };
  }

  if (!polygon || polygon.length < 3) {
    return {
      success: false,
      error: "El polígono debe tener al menos 3 vértices",
    };
  }

  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { data, error } = await supabase
    .from("delivery_zones")
    .insert([
      {
        name: name.trim(),
        polygon,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating delivery zone:", error);
    throw new Error("Failed to create delivery zone");
  }

  return { success: true, data: data as DeliveryZone };
}

/**
 * Updates an existing delivery zone's name and/or polygon vertices.
 */
export async function updateDeliveryZone(
  id: string,
  updates: { name?: string; polygon?: Array<{ lat: number; lng: number }> }
): Promise<{ success: true } | { success: false; error: string }> {
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    return { success: false, error: "El nombre de la zona es requerido" };
  }

  if (updates.polygon !== undefined && updates.polygon.length < 3) {
    return {
      success: false,
      error: "El polígono debe tener al menos 3 vértices",
    };
  }

  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
  }
  if (updates.polygon !== undefined) {
    updateData.polygon = updates.polygon;
  }

  const { error } = await supabase
    .from("delivery_zones")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating delivery zone:", error);
    throw new Error("Failed to update delivery zone");
  }

  return { success: true };
}

/**
 * Deletes a delivery zone by id.
 */
export async function deleteDeliveryZone(
  id: string
): Promise<{ success: true }> {
  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting delivery zone:", error);
    throw new Error("Failed to delete delivery zone");
  }

  return { success: true };
}

/**
 * Toggles the active/inactive state of a delivery zone without modifying
 * its name or polygon vertices.
 */
export async function toggleDeliveryZone(
  id: string,
  isActive: boolean
): Promise<{ success: true }> {
  const supabase = await createClient();

  // Verify admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("delivery_zones")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error toggling delivery zone:", error);
    throw new Error("Failed to toggle delivery zone");
  }

  return { success: true };
}

// ─── Zone Validation ────────────────────────────────────────────────────────

/**
 * Validates whether a geographic point (lat, lng) falls inside any **active**
 * delivery zone.
 *
 * Used during checkout to verify the customer's address is within coverage.
 *
 * @returns An object indicating whether the point is inside a zone, and if so,
 *          which zone matched.
 */
export async function validateDeliveryZone(
  lat: number,
  lng: number
): Promise<
  | { inZone: true; zoneName: string }
  | { inZone: false }
> {
  const supabase = await createClient();

  // Fetch only active zones
  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching delivery zones for validation:", error);
    // Graceful degradation: if we can't fetch zones, allow the order
    return { inZone: false };
  }

  if (!zones || zones.length === 0) {
    // No active zones configured — allow the order (graceful degradation)
    return { inZone: false };
  }

  const point = { lat, lng };

  for (const zone of zones as DeliveryZone[]) {
    if (isPointInPolygon(point, zone.polygon)) {
      return { inZone: true, zoneName: zone.name };
    }
  }

  return { inZone: false };
}
