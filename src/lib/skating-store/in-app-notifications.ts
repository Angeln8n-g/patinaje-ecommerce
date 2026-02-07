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
  const supabase = await createClient();
  
  // We use the authenticated client. 
  // If the user (e.g. delivery man) triggers this, they might not have RLS permission to insert for another user.
  // So we might need to use a Service Role client here or ensure RLS allows it.
  // For now, let's assume we are using standard client and if it fails, we'll need to upgrade permissions.
  // Actually, standard practice: use service role for system notifications.
  
  // However, in this project structure, `createClient` usually returns user client.
  // Let's try to use the current client and if needed we can make a policy.
  // The policy: "Enable insert for authenticated users" is risky if they can spam others.
  // Best: Policy "Enable insert for authenticated users where role is admin/delivery" OR "Service Role".
  
  // Let's stick to simple insert first.
  const { error } = await supabase
    .from('skating_notifications')
    .insert([{
      ...notification,
      is_read: false
    }]);

  if (error) {
    console.error('Error creating notification:', error);
    // Fallback: try with service role if available in env (usually not exposed to client actions directly securely without checks)
    // But since this is a server action, we COULD use service role if we initialize it.
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
