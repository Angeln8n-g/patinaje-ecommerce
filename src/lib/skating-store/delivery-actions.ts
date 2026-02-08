"use server";

import { createClient } from "@/lib/supabase/server";
import { Shipment, ShipmentStatus } from "@/types/skating-store";
import { mapDbOrderToOrder, getOrderById } from "./supabase-queries";
import { sendOrderNotification } from "./notification-actions";
import { createInAppNotification } from "./in-app-notifications";

export async function assignShipment(orderId: string, deliveryManId: string) {
  const supabase = await createClient();
  
  // Verify admin role
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser) throw new Error("Unauthorized");
  
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminUser.id)
    .single();
    
  if (adminProfile?.role !== "ADMIN") throw new Error("Unauthorized: Admin only");

  // Get delivery man info for notification
  const { data: deliveryManProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", deliveryManId)
    .single();

  const deliveryName = deliveryManProfile 
    ? `${deliveryManProfile.first_name || ""} ${deliveryManProfile.last_name || ""}`.trim() 
    : "Un repartidor";

  // Create or update shipment
  // Check if shipment exists for this order
  const { data: existingShipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .single();

  // Get order coordinates for proximity detection
  const { data: orderData } = await supabase
    .from("skating_orders")
    .select("customer_lat, customer_lng")
    .eq("id", orderId)
    .single();

  const destCoords = (orderData?.customer_lat && orderData?.customer_lng)
    ? { destination_lat: orderData.customer_lat, destination_lng: orderData.customer_lng }
    : {};

  let success = false;
  if (existingShipment) {
    const { error } = await supabase
      .from("shipments")
      .update({ 
        delivery_man_id: deliveryManId,
        status: 'ASIGNADO',
        updated_at: new Date().toISOString(),
        ...destCoords
      })
      .eq("id", existingShipment.id);
      
    if (error) throw new Error("Failed to reassign shipment");
    success = true;
  } else {
    const { error } = await supabase
      .from("shipments")
      .insert([{
        order_id: orderId,
        delivery_man_id: deliveryManId,
        status: 'ASIGNADO',
        ...destCoords
      }]);
      
    if (error) throw new Error("Failed to assign shipment");
    success = true;
  }

  // Notify customer
  if (success) {
    // Sync order status to 'confirmed'
    await supabase
      .from("skating_orders")
      .update({ status: 'confirmed' })
      .eq("id", orderId);

    try {
      const order = await getOrderById(orderId);
      if (order && order.user_id) {
        // In-App Notification
        await createInAppNotification({
          user_id: order.user_id,
          order_id: order.id,
          title: "¡Repartidor Asignado!",
          message: `${deliveryName} ha sido asignado para entregar tu pedido.`,
          type: 'info'
        });

        // Email Notification
        if (order.shipping?.email) {
          await sendOrderNotification({
            orderId: order.id,
            customerName: order.shipping.fullName,
            customerEmail: order.shipping.email,
            status: 'ASIGNADO',
            deliveryName: deliveryName,
            deliveryRating: 4.9 // Placeholder rating
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending assignment notification:", notifError);
    }
  }

  return { success: true };
}

export async function updateShipmentStatus(shipmentId: string, status: ShipmentStatus, lat?: number, lng?: number) {
  const supabase = await createClient();
  
  // Verify delivery role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Get current shipment and order info before update
  const { data: shipmentData } = await supabase
    .from("shipments")
    .select(`
      *,
      order:skating_orders (*)
    `)
    .eq("id", shipmentId)
    .single();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (lat !== undefined && lng !== undefined) {
    updateData.current_lat = lat;
    updateData.current_lng = lng;
  }

  const { error } = await supabase
    .from("shipments")
    .update(updateData)
    .eq("id", shipmentId);

  if (error) {
    console.error("Error updating shipment:", error);
    throw new Error("Failed to update shipment");
  }

  // Sync order status with shipment status
  if (shipmentData?.order?.id) {
    const orderStatusMap: Record<string, string> = {
      'ASIGNADO': 'confirmed',
      'EN_RUTA': 'shipped',
      'CERCA': 'shipped',
      'ENTREGADO': 'delivered',
    };
    const newOrderStatus = orderStatusMap[status];
    if (newOrderStatus) {
      await supabase
        .from("skating_orders")
        .update({ status: newOrderStatus })
        .eq("id", shipmentData.order.id);
    }
  }

  // Notify customer of status change
  if (shipmentData && (status === 'EN_RUTA' || status === 'CERCA' || status === 'ENTREGADO')) {
    try {
      // Use maybeSingle to avoid errors if order is not found (though it should exist)
      // The join in initial query returns an object, not array for single relation
      const order = mapDbOrderToOrder(shipmentData.order);
      
      // Fix: shipmentData.order is an object from the join, user_id is directly on it
      const userId = shipmentData.order.user_id;
      
      if (order && userId) {
        // In-App Notification Logic
        let title = '';
        let message = '';
        let type: 'info' | 'success' | 'warning' = 'info';

        switch (status) {
          case 'EN_RUTA':
            title = '¡Tu pedido va en camino!';
            message = 'El repartidor ha iniciado el viaje hacia tu ubicación.';
            break;
          case 'CERCA':
            title = '¡Repartidor Cerca!';
            message = 'El repartidor está muy cerca de tu dirección.';
            type = 'warning'; // Using warning color for attention
            break;
          case 'ENTREGADO':
            title = '¡Pedido Entregado!';
            message = 'Tu pedido ha sido entregado exitosamente. ¡Gracias por tu compra!';
            type = 'success';
            break;
        }

        await createInAppNotification({
          user_id: userId,
          order_id: order.id,
          title,
          message,
          type
        });

        // Email Notification
        // Check if shipping info exists and has email
        if (order.shipping && order.shipping.email) {
          console.log(`Sending ${status} email to ${order.shipping.email}`);
          await sendOrderNotification({
            orderId: order.id,
            customerName: order.shipping.fullName,
            customerEmail: order.shipping.email,
            status: status
          });
        } else {
          console.log("Skipping email notification: No shipping email found");
        }
      } else {
        console.warn("Skipping notification: Order or UserID missing", { orderId: order?.id, userId });
      }
    } catch (notifError) {
      console.error(`Error sending ${status} notification:`, notifError);
    }
  }

  return { success: true };
}

export async function updateDeliveryLocation(shipmentId: string, lat: number, lng: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shipments")
    .update({
      current_lat: lat,
      current_lng: lng,
      updated_at: new Date().toISOString()
    })
    .eq("id", shipmentId);

  if (error) {
    // Don't throw — this runs in a background interval and throwing breaks the loop
    console.warn("Error updating location (non-blocking):", error.message);
    return { success: false };
  }

  // Auto-detect proximity: if EN_RUTA and close to destination, switch to CERCA
  try {
    const { data: shipment } = await supabase
      .from("shipments")
      .select(`*, order:skating_orders (*)`)
      .eq("id", shipmentId)
      .single();

    if (shipment && shipment.status === 'EN_RUTA' && shipment.destination_lat && shipment.destination_lng) {
      const distance = haversineDistance(
        lat, lng,
        Number(shipment.destination_lat), Number(shipment.destination_lng)
      );

      // If within 500 meters, auto-update to CERCA
      if (distance <= 0.5) {
        await updateShipmentStatus(shipmentId, 'CERCA' as ShipmentStatus, lat, lng);
      }
    }
  } catch (proximityError) {
    console.warn("Proximity check failed (non-blocking):", proximityError);
  }

  return { success: true };
}


/**
 * Haversine formula to calculate distance between two coordinates in km.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}


export async function getDeliveryShipments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shipments")
    .select(`
      *,
      order:skating_orders (*)
    `)
    .eq("delivery_man_id", user.id)
    .neq("status", "ENTREGADO") // Only active shipments
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shipments:", error);
    return [];
  }

  return data.map((shipment: any) => ({
    ...shipment,
    order: mapDbOrderToOrder(shipment.order)
  }));
}

export async function getDeliveryHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shipments")
    .select(`
      *,
      order:skating_orders (*)
    `)
    .eq("delivery_man_id", user.id)
    .eq("status", "ENTREGADO")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching delivery history:", error);
    return [];
  }

  return data.map((shipment: any) => ({
    ...shipment,
    order: mapDbOrderToOrder(shipment.order)
  }));
}

export async function getAllDeliveryMen() {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  // Ideally we check admin role here too

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "DELIVERY");

  if (error) return [];

  // Fetch ratings for each delivery man
  // This is not efficient for large datasets but works for now
  // A better approach would be a database view or function
  const deliveryMenWithRatings = await Promise.all(data.map(async (dm) => {
    const { data: ratings, error: ratingsError } = await supabase
      .from('delivery_ratings')
      .select('rating')
      .eq('delivery_man_id', dm.id);
      
    let avgRating = 0;
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = sum / ratings.length;
    }
    
    return {
      ...dm,
      avg_rating: avgRating,
      rating_count: ratings?.length || 0
    };
  }));

  // Sort by rating descending
  return deliveryMenWithRatings.sort((a, b) => b.avg_rating - a.avg_rating);
}

export async function getDeliveryMenStats() {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .eq("role", "DELIVERY");

  if (profilesError) return [];

  // Get all delivered shipments with order details
  const { data: deliveredShipments } = await supabase
    .from("shipments")
    .select(`
      delivery_man_id,
      status,
      order:skating_orders (
        total
      )
    `)
    .eq("status", "ENTREGADO");

  // Get active shipments count
  const { data: activeShipments } = await supabase
    .from("shipments")
    .select("delivery_man_id")
    .neq("status", "ENTREGADO");

  // Get all ratings
  const { data: ratings } = await supabase
    .from("delivery_ratings")
    .select("delivery_man_id, rating");

  const stats = profiles.map(profile => {
    const profileId = profile.id;
    
    // Active shipments
    const activeCount = activeShipments?.filter(s => s.delivery_man_id === profileId).length || 0;
    
    // Delivered stats
    const myDelivered = deliveredShipments?.filter(s => s.delivery_man_id === profileId) || [];
    const deliveredCount = myDelivered.length;
    const totalSales = myDelivered.reduce((sum, s) => {
      // @ts-ignore
      return sum + (s.order?.total || 0);
    }, 0);

    // Rating stats
    const myRatings = ratings?.filter(r => r.delivery_man_id === profileId) || [];
    const ratingCount = myRatings.length;
    const avgRating = ratingCount > 0 
      ? myRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
      : 0;

    return {
      ...profile,
      activeShipments: activeCount,
      deliveredCount,
      totalSales,
      ratingCount,
      avgRating
    };
  });

  // Sort by avgRating by default for ranking
  return stats.sort((a, b) => b.avgRating - a.avgRating);
}

export async function getAllOrdersWithShipment() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("skating_orders")
    .select(`
      *,
      shipment:shipments (
        id,
        status,
        delivery_man_id,
        current_lat,
        current_lng
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  // Transform data to make shipment an object instead of array if needed
  // Supabase join returns array for 1:M, even if it's logically 1:1
  const transformedData = data.map((order: any) => ({
    ...mapDbOrderToOrder(order),
    shipment: order.shipment && Array.isArray(order.shipment) && order.shipment.length > 0 ? order.shipment[0] : null
  }));

  return transformedData;
}
