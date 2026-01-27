import { supabase } from '@/lib/supabase';
import { Product, Order, ContactMessage, ProductCategory, ShippingInfo, CartItem } from '@/types/skating-store';

export async function getProducts(category?: string | null) {
  let query = supabase
    .from('skating_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching products:', JSON.stringify(error, null, 2));
    return [];
  }

  return data as Product[];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('skating_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }

  return data as Product;
}

export async function createOrder(items: CartItem[], shipping: ShippingInfo, total: number) {
  // Get current user to link the order
  const { data: { user } } = await supabase.auth.getUser();

  const orderData = {
    customer_name: shipping.fullName,
    customer_address: shipping.address,
    customer_city: shipping.city,
    customer_postal_code: shipping.postalCode,
    customer_phone: shipping.phone,
    items: items,
    total: total,
    status: 'pending',
    user_id: user?.id || null // Link order to user if authenticated
  };

  const { data, error } = await supabase
    .from('skating_orders')
    .insert([orderData])
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', JSON.stringify(error, null, 2));
    throw error;
  }

  // Map back to Order interface if needed, or just return the DB result
  // For now we return the DB result cast as any, but in a real app we'd map it
  return data; 
}

export async function createContactMessage(message: Omit<ContactMessage, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('skating_contact_messages')
    .insert([message])
    .select()
    .single();

  if (error) {
    console.error('Error creating contact message:', error);
    throw error;
  }

  return data as ContactMessage;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}
