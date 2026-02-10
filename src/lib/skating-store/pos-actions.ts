"use server";

import { createClient } from "@/lib/supabase/server";
import {
  PosSession,
  CashSessionSummary,
  POSCartItem,
  PaymentInfo,
  Order,
  Product,
} from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";

/**
 * Helper: verifies the current user is authenticated and has the SELLER role.
 * Returns the seller's user ID and supabase client, or throws an error.
 */
async function requireSeller() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "SELLER") {
    throw new Error("Acceso denegado: se requiere rol SELLER");
  }

  return { supabase, userId: user.id };
}

/**
 * openCashSession — Opens a new cash register session for the authenticated seller.
 *
 * Records the date, time, and initial cash amount. Only one session can be open
 * at a time per seller.
 *
 * Validates: Requirement 3.1
 */
export async function openCashSession(
  initialAmount: number
): Promise<PosSession> {
  const { supabase, userId } = await requireSeller();

  if (initialAmount < 0) {
    throw new Error("El monto inicial no puede ser negativo");
  }

  // Check if the seller already has an open session
  const { data: existingSession } = await supabase
    .from("pos_sessions")
    .select("id")
    .eq("seller_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (existingSession) {
    throw new Error(
      "Ya existe una sesión de caja abierta. Cierre la sesión actual antes de abrir una nueva."
    );
  }

  const { data, error } = await supabase
    .from("pos_sessions")
    .insert([
      {
        seller_id: userId,
        initial_amount: initialAmount,
        total_sales: 0,
        total_card_sales: 0,
        total_cash_sales: 0,
        transaction_count: 0,
        status: "open",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error opening cash session:", error);
    throw new Error("Error al abrir la sesión de caja");
  }

  return data as PosSession;
}

/**
 * closeCashSession — Closes an open cash register session with a summary.
 *
 * Calculates the expected amount (initial_amount + total_cash_sales),
 * compares it with the reported amount, and returns a full summary
 * including total sales, transaction count, and payment method breakdown.
 *
 * Validates: Requirements 3.6, 3.7
 */
export async function closeCashSession(
  sessionId: string,
  reportedAmount: number
): Promise<CashSessionSummary> {
  const { supabase, userId } = await requireSeller();

  if (!sessionId) {
    throw new Error("ID de sesión requerido");
  }

  if (reportedAmount < 0) {
    throw new Error("El monto reportado no puede ser negativo");
  }

  // Fetch the session and verify ownership
  const { data: session, error: fetchError } = await supabase
    .from("pos_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("seller_id", userId)
    .single();

  if (fetchError || !session) {
    throw new Error("Sesión de caja no encontrada");
  }

  if (session.status === "closed") {
    throw new Error("Esta sesión de caja ya fue cerrada");
  }

  // Calculate expected amount: initial_amount + total_cash_sales
  const expectedAmount =
    Number(session.initial_amount) + Number(session.total_cash_sales);
  const difference = reportedAmount - expectedAmount;

  // Update the session to closed
  const { error: updateError } = await supabase
    .from("pos_sessions")
    .update({
      status: "closed",
      reported_amount: reportedAmount,
      expected_amount: expectedAmount,
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Error closing cash session:", updateError);
    throw new Error("Error al cerrar la sesión de caja");
  }

  return {
    total_sales: Number(session.total_sales),
    total_card_sales: Number(session.total_card_sales),
    total_cash_sales: Number(session.total_cash_sales),
    transaction_count: Number(session.transaction_count),
    expected_amount: expectedAmount,
    reported_amount: reportedAmount,
    difference,
  };
}

/**
 * createPOSOrder — Creates an in-store POS order with stock validation,
 * stock deduction, and inventory movement recording.
 *
 * Steps:
 * 1. Validate that all products have sufficient stock
 * 2. Create the order with seller_id and order_type='in_store'
 * 3. Deduct stock from each product
 * 4. Create inventory_movement of type 'out' for each product sold
 * 5. Update the active POS session totals
 *
 * Validates: Requirements 2.1, 2.3, 2.5, 2.6, 7.1, 7.2
 */
export async function createPOSOrder(
  items: POSCartItem[],
  payment: PaymentInfo,
  customerName: string,
  customerPhone?: string
): Promise<Order> {
  const { supabase, userId } = await requireSeller();

  if (!items || items.length === 0) {
    throw new Error("El pedido debe contener al menos un producto");
  }

  if (!customerName || customerName.trim() === "") {
    throw new Error("El nombre del cliente es requerido");
  }

  // Verify the seller has an open cash session
  const { data: activeSession } = await supabase
    .from("pos_sessions")
    .select("id")
    .eq("seller_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (!activeSession) {
    throw new Error(
      "Debe abrir una sesión de caja antes de crear pedidos"
    );
  }

  // Step 1: Validate stock for all products
  const productIds = items.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabase
    .from("skating_products")
    .select("id, stock, status, name")
    .in("id", productIds);

  if (productsError || !products) {
    throw new Error("Error al verificar el stock de los productos");
  }

  // Build a map for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new Error(`Producto no encontrado: ${item.product_name}`);
    }
    if (product.status !== "active") {
      throw new Error(`Producto no disponible: ${product.name}`);
    }
    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`
      );
    }
  }

  // Calculate total
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Step 2: Create the order (Req 2.1 — seller_id as creator, order_type='in_store')
  // Map POSCartItem to the format expected by skating_orders items column
  const orderItems = items.map((item) => ({
    product: {
      id: item.product_id,
      name: item.product_name,
      price: item.price,
    },
    quantity: item.quantity,
    selectedVariant: item.selectedVariant || undefined,
  }));

  const orderData: Record<string, unknown> = {
    customer_name: customerName.trim(),
    customer_phone: customerPhone?.trim() || null,
    customer_address: "Retiro en tienda",
    customer_city: "",
    customer_postal_code: "",
    items: orderItems,
    total,
    status: "delivered", // POS orders are immediately fulfilled
    payment_method: payment.method,
    payment_status: "paid",
    seller_id: userId,
    order_type: "in_store",
    dispatched_at: new Date().toISOString(),
  };

  const { data: newOrder, error: orderError } = await supabase
    .from("skating_orders")
    .insert([orderData])
    .select()
    .single();

  if (orderError) {
    console.error("Error creating POS order:", orderError);
    throw new Error("Error al crear el pedido");
  }

  // Step 3 & 4: Deduct stock and create inventory movements for each product
  for (const item of items) {
    const product = productMap.get(item.product_id)!;
    const newStock = product.stock - item.quantity;

    // Update product stock (Req 2.5, 7.2)
    const { error: stockError } = await supabase
      .from("skating_products")
      .update({
        stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.product_id);

    if (stockError) {
      console.error(
        `Error updating stock for product ${item.product_id}:`,
        stockError
      );
      // Continue with other products — the order is already created
    }

    // Create inventory movement of type 'out' (Req 7.1)
    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert([
        {
          product_id: item.product_id,
          user_id: userId,
          quantity_change: -item.quantity,
          movement_type: "out",
          reason: `Venta POS - Pedido #${newOrder.id.slice(0, 8)}`,
        },
      ]);

    if (movementError) {
      console.error(
        `Error creating inventory movement for product ${item.product_id}:`,
        movementError
      );
    }
  }

  // Step 5: Update the active POS session totals
  const saleAmount = total;
  const isCard = payment.method === "card";

  const { data: currentSession } = await supabase
    .from("pos_sessions")
    .select("total_sales, total_card_sales, total_cash_sales, transaction_count")
    .eq("id", activeSession.id)
    .single();

  if (currentSession) {
    const { error: sessionError } = await supabase
      .from("pos_sessions")
      .update({
        total_sales: Number(currentSession.total_sales) + saleAmount,
        total_card_sales:
          Number(currentSession.total_card_sales) + (isCard ? saleAmount : 0),
        total_cash_sales:
          Number(currentSession.total_cash_sales) + (isCard ? 0 : saleAmount),
        transaction_count: Number(currentSession.transaction_count) + 1,
      })
      .eq("id", activeSession.id);

    if (sessionError) {
      console.error("Error updating POS session totals:", sessionError);
    }
  }

  // Map the created order to the Order type
  return {
    ...mapDbOrderToOrder(newOrder),
    seller_id: newOrder.seller_id,
    order_type: newOrder.order_type,
    dispatched_at: newOrder.dispatched_at,
  };
}

/**
 * searchProductsForPOS — Searches for active products with stock available.
 *
 * Returns products matching the query that have stock > 0 and status = 'active',
 * including price and current stock information.
 *
 * Validates: Requirement 2.2
 */
export async function searchProductsForPOS(query: string): Promise<Product[]> {
  const { supabase } = await requireSeller();

  if (!query || query.trim() === "") {
    return [];
  }

  const searchTerm = query.trim();

  // Try exact barcode match first
  const { data: barcodeMatch } = await supabase
    .from("skating_products")
    .select("*")
    .eq("status", "active")
    .gt("stock", 0)
    .eq("barcode", searchTerm)
    .limit(1);

  if (barcodeMatch && barcodeMatch.length > 0) {
    return barcodeMatch as Product[];
  }

  // Fallback to name search
  const { data, error } = await supabase
    .from("skating_products")
    .select("*")
    .eq("status", "active")
    .gt("stock", 0)
    .ilike("name", `%${searchTerm}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error searching products for POS:", error);
    return [];
  }

  return (data || []) as Product[];
}

/**
 * getActiveSession — Returns the seller's currently open cash session, or null.
 */
export async function getActiveSession(): Promise<PosSession | null> {
  const { supabase, userId } = await requireSeller();

  const { data, error } = await supabase
    .from("pos_sessions")
    .select("*")
    .eq("seller_id", userId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("Error fetching active session:", error);
    return null;
  }

  return (data as PosSession) || null;
}

/**
 * createProductExchange — Processes a product exchange for an existing order.
 * Returns the original product to stock and deducts the new product.
 * Requires a justification reason.
 */
export async function createProductExchange(
  orderId: string,
  originalProductId: string,
  originalQuantity: number,
  newProductId: string,
  newQuantity: number,
  justification: string
): Promise<void> {
  const { supabase, userId } = await requireSeller();

  if (!justification || justification.trim().length < 5) {
    throw new Error("Debe proporcionar una justificación de al menos 5 caracteres");
  }

  // Verify the order exists and belongs to this seller
  const { data: order, error: orderError } = await supabase
    .from("skating_orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.seller_id !== userId) {
    throw new Error("No tiene permiso para modificar este pedido");
  }

  // Verify new product has enough stock
  const { data: newProduct, error: npError } = await supabase
    .from("skating_products")
    .select("id, name, stock, price")
    .eq("id", newProductId)
    .single();

  if (npError || !newProduct) {
    throw new Error("Producto nuevo no encontrado");
  }

  if (newProduct.stock < newQuantity) {
    throw new Error(`Stock insuficiente para "${newProduct.name}". Disponible: ${newProduct.stock}`);
  }

  // Return original product to stock
  const { error: returnError } = await supabase.rpc("increment_stock", {
    product_id: originalProductId,
    qty: originalQuantity,
  });

  // If RPC doesn't exist, do it manually
  if (returnError) {
    const { data: origProduct } = await supabase
      .from("skating_products")
      .select("stock")
      .eq("id", originalProductId)
      .single();

    if (origProduct) {
      await supabase
        .from("skating_products")
        .update({ stock: origProduct.stock + originalQuantity })
        .eq("id", originalProductId);
    }
  }

  // Create inventory movement for return (in)
  await supabase.from("inventory_movements").insert({
    product_id: originalProductId,
    movement_type: "in",
    quantity: originalQuantity,
    notes: `Cambio de producto - Pedido #${orderId.slice(0, 8)} - ${justification}`,
  });

  // Deduct new product stock
  await supabase
    .from("skating_products")
    .update({ stock: newProduct.stock - newQuantity })
    .eq("id", newProductId);

  // Create inventory movement for new product (out)
  await supabase.from("inventory_movements").insert({
    product_id: newProductId,
    movement_type: "out",
    quantity: newQuantity,
    notes: `Cambio de producto - Pedido #${orderId.slice(0, 8)} - ${justification}`,
  });

  // Update the order items (replace the original product with the new one in the JSON)
  const { data: fullOrder } = await supabase
    .from("skating_orders")
    .select("items, total")
    .eq("id", orderId)
    .single();

  if (fullOrder) {
    const items = (fullOrder.items as any[]) || [];
    const updatedItems = items.map((item: any) => {
      if (item.product_id === originalProductId) {
        return {
          ...item,
          product_id: newProductId,
          name: newProduct.name,
          price: newProduct.price,
          quantity: newQuantity,
        };
      }
      return item;
    });

    // Recalculate total
    const newTotal = updatedItems.reduce(
      (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    await supabase
      .from("skating_orders")
      .update({ items: updatedItems, total: newTotal })
      .eq("id", orderId);
  }
}

