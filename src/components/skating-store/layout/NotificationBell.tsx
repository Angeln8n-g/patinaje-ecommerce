"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import type { InAppNotification } from "@/lib/skating-store/in-app-notifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await authFetch<InAppNotification[]>("/api/notifications?limit=20");
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try { await authFetch(`/api/notifications/${id}/read`, { method: "PUT" }); } catch {}
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    try { await authFetch("/api/notifications/read-all", { method: "PUT" }); } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);
    if (notification.order_id) { setIsOpen(false); router.push(`/skating-store/tracking/${notification.order_id}`); }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity cursor-pointer relative">
          <div className="h-8 w-8 flex items-center justify-center relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in zoom-in">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold hidden md:inline">Alerts</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMarkAllRead}>
              <Check className="h-3 w-3 mr-1" /> Marcar leídas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-4 cursor-pointer border-b last:border-0 items-start gap-3 focus:bg-muted/50 ${!notification.is_read ? "bg-primary/5" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notification.is_read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${!notification.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 pt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
