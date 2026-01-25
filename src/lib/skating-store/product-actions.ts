"use server";

import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/skating-store";

export async function createProduct(data: Omit<Product, "id" | "created_at" | "updated_at">) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("skating_products")
    .insert([{
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

  if (error) {
    console.error("Error creating product:", error);
    throw new Error("Failed to create product");
  }
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("skating_products")
    .update(data)
    .eq("id", id);

  if (error) {
    console.error("Error updating product:", error);
    throw new Error("Failed to update product");
  }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  const { error } = await supabase
    .from("skating_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product");
  }
}
