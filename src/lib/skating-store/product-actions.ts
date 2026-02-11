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

export async function getProductByIdServer(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skating_products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching product:", error.message, error.code);
    return null;
  }

  return data as Product;
}

export async function getProductsServer(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skating_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []) as Product[];
}

export async function getProductsFilteredServer(category?: string | null, search?: string | null): Promise<Product[]> {
  const supabase = await createClient();

  let query = supabase
    .from("skating_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []) as Product[];
}

export async function getProductReviewsServer(productId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skating_product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }

  return data || [];
}
