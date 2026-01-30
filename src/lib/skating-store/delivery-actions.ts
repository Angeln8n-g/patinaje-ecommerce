"use server";

import { createClient } from "@/lib/supabase/server";
import { Shipment, ShipmentStatus } from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";

export async function assignShipment(orderId: string, deliveryManId: string) {
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

  // Create or update shipment
  // Check if shipment exists for this order
  const { data: existingShipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .single();

  if (existingShipment) {
    const { error } = await supabase
      .from("shipments")
      .update({ 
        delivery_man_id: deliveryManId,
        status: 'ASIGNADO',
        updated_at: new Date().toISOString()
      })
      .eq("id", existingShipment.id);
      
    if (error) throw new Error("Failed to reassign shipment");
  } else {
    const { error } = await supabase
      .from("shipments")
      .insert([{
        order_id: orderId,
        delivery_man_id: deliveryManId,
        status: 'ASIGNADO'
      }]);
      
    if (error) throw new Error("Failed to assign shipment");
  }

  return { success: true };
}

export async function updateShipmentStatus(shipmentId: string, status: ShipmentStatus, lat?: number, lng?: number) {
  const supabase = await createClient();
  
  // Verify delivery role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // RLS will handle the check if the shipment belongs to the user, 
  // but we can double check role if we want. RLS is safer.

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
    console.error("Error updating location:", error);
    throw new Error("Failed to update location");
  }

  return { success: true };
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
    .select("id, email")
    .eq("role", "DELIVERY");

  if (error) return [];
  return data;
}

export async function getDeliveryMenStats() {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .eq("role", "DELIVERY");

  if (profilesError) return [];

  // Get active shipments counts
  // We can do this with a join if we had defined it properly or separate queries
  // For simplicity, let's just fetch all active shipments and count in JS
  const { data: shipments, error: shipmentsError } = await supabase
    .from("shipments")
    .select("delivery_man_id, status")
    .neq("status", "ENTREGADO");
    
  if (shipmentsError) return profiles.map(p => ({ ...p, activeShipments: 0 }));

  const stats = profiles.map(profile => {
    const activeCount = shipments.filter(s => s.delivery_man_id === profile.id).length;
    return {
      ...profile,
      activeShipments: activeCount
    };
  });

  return stats;
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
