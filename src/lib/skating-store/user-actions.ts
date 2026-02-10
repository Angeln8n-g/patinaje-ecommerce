"use server";

import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/skating-store";

export async function getUsers() {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "ADMIN") return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data;
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }

  return { success: true };
}

/**
 * getSellers — Returns all profiles with role SELLER, including name, email and active status.
 * Only accessible by admins.
 * Validates: Requirement 1.4
 */
export async function getSellers() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, created_at")
    .eq("role", "SELLER")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sellers:", error);
    return [];
  }

  return data || [];
}

/**
 * toggleSellerRole — Activates or deactivates a seller by changing their role.
 * Setting active=false changes role to USER, active=true changes role to SELLER.
 * Only accessible by admins.
 * Validates: Requirement 1.5
 */
export async function toggleSellerRole(userId: string, active: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const newRole: UserRole = active ? "SELLER" : "USER";

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    console.error("Error toggling seller role:", error);
    throw new Error("Failed to toggle seller role");
  }

  return { success: true };
}

/**
 * getNonSellerUsers — Returns all profiles that are NOT sellers (role != SELLER and != ADMIN).
 * Used to assign the SELLER role to existing users.
 * Only accessible by admins.
 */
export async function getNonSellerUsers() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, created_at")
    .in("role", ["USER", "DELIVERY"])
    .order("email", { ascending: true });

  if (error) {
    console.error("Error fetching non-seller users:", error);
    return [];
  }

  return data || [];
}

