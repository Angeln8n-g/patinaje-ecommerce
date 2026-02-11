import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/skating-store";

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
