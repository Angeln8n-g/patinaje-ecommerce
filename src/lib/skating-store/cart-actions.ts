"use server";

import { createClient } from "@/lib/supabase/server";
import { CartItem } from "@/types/skating-store";

export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    const supabase = await createClient();
    // Get cart ID
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!cart) {
      // Create cart if not exists
      const { data: newCart } = await supabase
        .from("carts")
        .insert([{ user_id: userId }])
        .select("id")
        .single();
        
      if (!newCart) return [];
      return [];
    }

    // Get cart items with product details
    const { data: items, error } = await supabase
      .from("cart_items")
      .select(`
        quantity,
        selected_variant,
        product:skating_products (
          id,
          name,
          price,
          description,
          category,
          images,
          stock,
          featured,
          variant_type,
          variant_options
        )
      `)
      .eq("cart_id", cart.id);

    if (error) {
      console.error("Error fetching cart items:", error);
      return [];
    }

    // Map to CartItem type
    return items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity,
      selectedVariant: item.selected_variant || undefined
    }));
  } catch (error) {
    console.error("Error in getCart:", error);
    return [];
  }
}

export async function addToCart(userId: string, productId: string, quantity: number, variant?: string) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("addToCart: Not authenticated", authError);
      return { success: false, error: "Not authenticated" };
    }

    if (user.id !== userId) {
      console.warn(`addToCart: User ID mismatch. Client: ${userId}, Session: ${user.id}. Using Session ID.`);
      userId = user.id;
    }

    // 1. Get or create cart
    // We use .maybeSingle() instead of .single() to avoid error when not found
    let { data: cart, error: fetchError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
        console.error("addToCart: Error fetching cart", fetchError);
        return { success: false, error: fetchError };
    }

    if (!cart) {
      console.log(`addToCart: Creating new cart for user ${userId}`);
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert([{ user_id: userId }])
        .select("id")
        .single();
      
      if (createError) {
          console.error("addToCart: Error creating cart", createError);
          return { success: false, error: createError };
      }
      cart = newCart;
    }

    if (!cart) throw new Error("Could not create cart (unknown error)");

    // 2. Check if item exists (with same variant)
    let query = supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId);
    
    if (variant) {
      query = query.eq("selected_variant", variant);
    } else {
      query = query.is("selected_variant", null);
    }

    const { data: existingItem, error: itemError } = await query.maybeSingle();

    if (itemError) {
        console.error("addToCart: Error checking item", itemError);
        return { success: false, error: itemError };
    }

    if (existingItem) {
      // Update quantity
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error("addToCart: Error updating item", updateError);
        return { success: false, error: updateError };
      }
    } else {
      // Insert new item
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert([{
          cart_id: cart.id,
          product_id: productId,
          quantity: quantity,
          selected_variant: variant || null
        }]);
        
      if (insertError) {
        console.error("addToCart: Error inserting item", insertError);
        return { success: false, error: insertError };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error adding to cart:", error);
    return { success: false, error };
  }
}

export async function updateCartItemQuantity(userId: string, productId: string, quantity: number) {
  try {
    const supabase = await createClient();
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!cart) return { success: false, error: "Cart not found" };

    if (quantity <= 0) {
      // Remove item
      await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", cart.id)
        .eq("product_id", productId);
    } else {
      // Update quantity
      await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("cart_id", cart.id)
        .eq("product_id", productId);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating cart:", error);
    return { success: false, error };
  }
}

export async function removeFromCart(userId: string, productId: string) {
  try {
    const supabase = await createClient();
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!cart) return { success: false, error: "Cart not found" };

    await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id)
      .eq("product_id", productId);

    return { success: true };
  } catch (error) {
    console.error("Error removing from cart:", error);
    return { success: false, error };
  }
}

export async function clearCart(userId: string) {
  try {
    const supabase = await createClient();
    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!cart) return { success: false };

    await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    return { success: true };
  } catch (error) {
    console.error("Error clearing cart:", error);
    return { success: false, error };
  }
}
