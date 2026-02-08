import { createClient } from '@/lib/supabase/client';
import { Product, Order, ContactMessage, ProductCategory, ShippingInfo, CartItem, InventoryMovement, Review } from '@/types/skating-store';
type StaticContentRow = { slug: string; data: Record<string, unknown>; updated_at: string };

const supabase = createClient();

export async function getProductByBarcode(barcode: string) {
  const { data, error } = await supabase
    .from('skating_products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }

  return data as Product | null;
}

export async function addInventoryMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert([movement])
    .select()
    .single();

  if (error) {
    console.error('Error adding inventory movement:', error);
    throw error;
  }

  return data as InventoryMovement;
}

export async function updateProductStock(productId: string, quantityChange: number, movementType: 'in' | 'out' | 'adjustment', reason?: string, newPrice?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get current stock
  const { data: product, error: fetchError } = await supabase
    .from('skating_products')
    .select('stock, price')
    .eq('id', productId)
    .single();

  if (fetchError || !product) throw new Error('Product not found');

  const newStock = product.stock + quantityChange;
  const updateData: any = { 
    stock: newStock, 
    updated_at: new Date().toISOString() 
  };

  if (newPrice !== undefined && newPrice !== product.price) {
    updateData.price = newPrice;
  }

  // Update stock and optionally price
  const { error: updateError } = await supabase
    .from('skating_products')
    .update(updateData)
    .eq('id', productId);

  if (updateError) throw updateError;

  // Record movement
  await addInventoryMovement({
    product_id: productId,
    user_id: user.id,
    quantity_change: quantityChange,
    movement_type: movementType,
    reason: reason || `Actualización de stock: ${quantityChange > 0 ? '+' : ''}${quantityChange}${newPrice !== undefined ? ` (Nuevo precio: $${newPrice})` : ''}`
  });

  return { newStock, newPrice: updateData.price || product.price };
}

export async function quickCreateProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('skating_products')
    .insert([{
      ...productData,
      description: productData.description || "",
      images: productData.images || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }

  const newProduct = data as Product;

  // Record initial movement
  await addInventoryMovement({
    product_id: newProduct.id,
    user_id: user.id,
    quantity_change: newProduct.stock,
    movement_type: 'in',
    reason: 'Alta inicial de producto'
  });

  return newProduct;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data;
}

export async function getProducts(category?: string | null, search?: string | null) {
  let query = supabase
    .from('skating_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
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

export function mapDbOrderToOrder(dbOrder: any): Order {
  if (!dbOrder) return null as any;
  
  // Parse items to ensure variants are included if present
  // If items come as JSON string, parse them, otherwise use as is
  const parsedItems = typeof dbOrder.items === 'string' 
    ? JSON.parse(dbOrder.items) 
    : dbOrder.items;

  return {
    id: dbOrder.id,
    user_id: dbOrder.user_id,
    items: parsedItems,
    total: dbOrder.total,
    status: dbOrder.status,
    payment_method: dbOrder.payment_method,
    payment_status: dbOrder.payment_status,
    qr_token: dbOrder.qr_token,
    created_at: dbOrder.created_at,
    shipping: {
      fullName: dbOrder.customer_name,
      address: dbOrder.customer_address,
      city: dbOrder.customer_city,
      postalCode: dbOrder.customer_postal_code,
      phone: dbOrder.customer_phone,
      email: dbOrder.customer_email
    }
  };
}

export async function createOrder(items: CartItem[], shipping: ShippingInfo, total: number, paymentMethod: 'card' | 'cash' = 'card') {
  // Get current user to link the order
  const { data: { user } } = await supabase.auth.getUser();

  const orderData: Record<string, unknown> = {
    customer_name: shipping.fullName,
    customer_address: shipping.address,
    customer_city: shipping.city,
    customer_postal_code: shipping.postalCode,
    customer_phone: shipping.phone,
    customer_email: user?.email || null,
    items: items,
    total: total,
    status: 'pending',
    payment_method: paymentMethod,
    payment_status: 'pending',
    user_id: user?.id || null,
    ...(shipping.lat != null && { customer_lat: shipping.lat }),
    ...(shipping.lng != null && { customer_lng: shipping.lng }),
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

  return mapDbOrderToOrder(data); 
}

export async function getOrderById(id: string) {
  const supabase = createClient();
  
  // Try to get order via RPC (public access for tracking)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_tracking_info', { p_order_id: id });

  if (rpcData && rpcData.length > 0) {
    const dbOrder = rpcData[0];
    return {
      id: dbOrder.id,
      created_at: dbOrder.created_at,
      status: dbOrder.status as any,
      total: dbOrder.total,
      items: dbOrder.items,
      payment_method: dbOrder.payment_method as any,
      payment_status: dbOrder.payment_status as any,
      qr_token: dbOrder.qr_token,
      shipping: {
        fullName: dbOrder.customer_name,
        address: dbOrder.customer_address,
        city: dbOrder.customer_city,
        postalCode: dbOrder.customer_postal_code,
        phone: dbOrder.customer_phone,
        email: dbOrder.customer_email
      }
    } as Order;
  }

  // Fallback to standard query (requires auth)
  const { data, error } = await supabase
    .from('skating_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }

  return mapDbOrderToOrder(data);
}

export async function confirmCashPayment(orderId: string, qrToken: string) {
  const { data: order, error: fetchError } = await supabase
    .from('skating_orders')
    .select('id, qr_token')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) throw new Error('Pedido no encontrado');
  
  if (order.qr_token !== qrToken) {
    throw new Error('Código QR inválido para este pedido');
  }

  const { error: updateError } = await supabase
    .from('skating_orders')
    .update({ 
      payment_status: 'paid',
      status: 'delivered'
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // Also update shipment status if it exists
  await supabase
    .from('shipments')
    .update({ status: 'ENTREGADO', updated_at: new Date().toISOString() })
    .eq('order_id', orderId);

  return true;
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
    const msgText = String((error as any)?.message || "");
    if ((error as any)?.code === 'PGRST116') {
      return null;
    }
    if (msgText.includes('AbortError')) {
      return null;
    }
    const msg = typeof error === 'object' ? JSON.stringify(error, null, 2) : msgText;
    console.error('Error fetching profile:', msg);
    return null;
  }

  return data;
}

export async function getUserOrders(userId: string) {
  const { data, error } = await supabase
    .from('skating_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }

  return (data || []).map(mapDbOrderToOrder);
}

export async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select();

  if (error) {
    const msgText = String((error as any)?.message || "");
    if (msgText.includes('AbortError')) {
      return null;
    }
    console.error('Error updating profile:', typeof error === 'object' ? JSON.stringify(error, null, 2) : msgText);
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] || null;
  }
  return data || null;
}

export async function getStaticContentClient(slug: string) {
  const { data, error } = await supabase
    .from('static_content')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    return null;
  }
  return data as StaticContentRow;
}

export async function updateStaticContentClient(slug: string, newData: Record<string, unknown>) {
  // First check if it exists
  const { data: existing } = await supabase
    .from('static_content')
    .select('*')
    .eq('slug', slug)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('static_content')
      .update({ 
        data: { ...existing.data, ...newData },
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('static_content')
      .insert([{ 
        slug, 
        data: newData,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}

export async function getProductReviews(productId: string) {
  const { data, error } = await supabase
    .from('skating_product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }

  return data as Review[];
}

export async function createProductReview(review: Omit<Review, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('skating_product_reviews')
    .insert([review])
    .select()
    .single();

  if (error) {
    console.error('Error creating review:', error);
    throw error;
  }

  return data as Review;
}

export async function hasPurchasedProduct(userId: string, productId: string) {
  // Buscamos en los pedidos del usuario que tengan estado 'delivered'
  // y que contengan el producto en el campo JSONB 'items'
  const { data, error } = await supabase
    .from('skating_orders')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'delivered')
    .filter('items', 'cs', JSON.stringify([{ product: { id: productId } }]));

  if (error) {
    console.error('Error checking purchase status:', error);
    return false;
  }

  return data && data.length > 0;
}
