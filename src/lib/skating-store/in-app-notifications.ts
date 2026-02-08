"use server";

import { createClient } from "@/lib/supabase/server";

export interface InAppNotification {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export async function createInAppNotification(notification: Omit<InAppNotification, 'id' | 'created_at' | 'is_read'>) {
  // Try Service Role first (bypasses RLS — needed when delivery/admin inserts for another user)
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('skating_notifications')
      .insert([{ ...notification, is_read: false }]);

    if (!error) return;
    console.warn('Service role insert failed, falling back to authenticated client:', error.message);
  } catch {
    // Service role key not configured — fall through to authenticated client
  }

  // Fallback: use authenticated client (works for self-notifications via RLS policy)
  const supabase = await createClient();
  const { error } = await supabase
    .from('skating_notifications')
    .insert([{ ...notification, is_read: false }]);

  if (error) {
    console.error('Error creating notification:', error);
  }
}

export async function getUserNotifications(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skating_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data as InAppNotification[];
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('skating_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('skating_notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}
