"use server";

import { createClient } from "@/lib/supabase/server";

export interface DeliveryRating {
  id: string;
  order_id: string;
  delivery_man_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export async function submitDeliveryRating(
  orderId: string, 
  rating: number, 
  comment: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Must be logged in to rate");
  }

  // 1. Get shipment to find delivery_man_id
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('delivery_man_id')
    .eq('order_id', orderId)
    .single();

  if (shipmentError || !shipment || !shipment.delivery_man_id) {
    throw new Error("Delivery information not found");
  }

  // 2. Insert rating
  const { error: insertError } = await supabase
    .from('delivery_ratings')
    .insert([{
      order_id: orderId,
      user_id: user.id,
      delivery_man_id: shipment.delivery_man_id,
      rating: rating,
      comment: comment
    }]);

  if (insertError) {
    // Check for unique constraint violation (already rated)
    if (insertError.code === '23505') {
      throw new Error("Order already rated");
    }
    console.error("Error submitting rating:", insertError);
    throw new Error("Failed to submit rating");
  }

  return { success: true };
}

export async function getDeliveryManStats(deliveryManId: string) {
  const supabase = await createClient();
  
  const { data: ratings, error } = await supabase
    .from('delivery_ratings')
    .select('*')
    .eq('delivery_man_id', deliveryManId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching delivery man stats:", error);
    return null;
  }

  const totalRatings = ratings.length;
  if (totalRatings === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentComments: []
    };
  }

  const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
  const averageRating = sum / totalRatings;

  const ratingDistribution = ratings.reduce((acc, curr) => {
    acc[curr.rating] = (acc[curr.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const recentComments = ratings
    .filter(r => r.comment && r.comment.length > 0)
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at
    }));

  return {
    averageRating,
    totalRatings,
    ratingDistribution,
    recentComments
  };
}

export async function getOrderRating(orderId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('delivery_ratings')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error("Error fetching rating:", error);
  }

  return data as DeliveryRating | null;
}
