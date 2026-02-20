"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile, getUserOrders, cancelOrderByDelay } from "@/lib/skating-store/supabase-queries";
import { cancelUserOrder } from "@/lib/skating-store/order-cancellation-actions";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, User as UserIcon, MapPin, Phone, ShoppingBag, ArrowRight, Clock, Truck, CheckCircle2, Package, Lock, Store, XCircle, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { Order } from "@/types/skating-store";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CancelOrderModal } from "@/components/shared/CancelOrderModal";

const STATUS_MAP = {
  pending: { label: "Pendiente", icon: Clock, color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmado", icon: CheckCircle2, color: "bg-blue-100 text-blue-700" },
  shipped: { label: "En camino", icon: Truck, color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Entregado", icon: Package, color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-700" },
};

export default function ProfilePage() {
  const { user, isLoading: authLoading, isSeller, isAdmin, isDelivery } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setSavingPassword] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", phone: "",
    address_street: "", address_city: "", address_state: "",
    address_postal_code: "", address_country: "",
  });
  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) {
      Promise.all([loadProfile(user.id), loadOrders(user.id)]).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const loadProfile = async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      if (profile) setFormData({
        first_name: profile.first_name || "", last_name: profile.last_name || "",
        phone: profile.phone || "", address_street: profile.address_street || "",
        address_city: profile.address_city || "", address_state: profile.address_state || "",
        address_postal_code: profile.address_postal_code || "", address_country: profile.address_country || "",
      });
    } catch { toast.error("Error al cargar el perfil"); }
  };

  const loadOrders = async (userId: string) => {
    try { setOrders(await getUserOrders(userId)); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try { await updateProfile(user.id, formData); toast.success("Perfil actualizado correctamente"); }
    catch { toast.error("Error al actualizar el perfil"); }
    finally { setSaving(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    setSavingPassword(true);
    try {
      await authFetch("/api/auth/password", { method: "PUT", body: { password: passwordData.password } });
      toast.success("Contraseña actualizada correctamente");
      setPasswordData({ password: "", confirmPassword: "" });
    } catch (error: any) { toast.error(error.message || "Error al actualizar la contraseña"); }
    finally { setSavingPassword(false); }
  };

  const canCancelByDelay = (order: Order) => {
    if (order.status === "delivered" || order.status === "cancelled") return false;
    const hoursDiff = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24;
  };

  const canCancelByUser = (order: Order) => {
    return order.status === "pending";
  };

  const handleCancelByDelay = async (orderId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar este pedido por retraso?")) return;
    setCancellingId(orderId);
    try {
      await cancelOrderByDelay(orderId);
      toast.success("Pedido cancelado exitosamente");
      if (user) await loadOrders(user.id);
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar el pedido");
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenCancelModal = (order: Order) => {
    setCancelTargetOrder(order);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reasonCode: string, reasonDescription?: string) => {
    if (!cancelTargetOrder) return;
    setCancellingId(cancelTargetOrder.id);
    try {
      await cancelUserOrder(cancelTargetOrder.id, { reasonCode, reasonDescription });
      toast.success("Pedido cancelado exitosamente");
      setCancelModalOpen(false);
      setCancelTargetOrder(null);
      if (user) await loadOrders(user.id);
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar el pedido");
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Mi Cuenta</h1>
        <p className="text-muted-foreground text-lg">Gestiona tus pedidos e información personal.</p>
        {isSeller && <Link href="/seller"><Button className="mt-4 font-bold" variant="default"><Store className="mr-2 h-4 w-4" />Ir al Panel de Vendedor</Button></Link>}
        {isAdmin && <Link href="/admin"><Button className="mt-4 font-bold" variant="default"><ArrowRight className="mr-2 h-4 w-4" />Ir al Panel de Admin</Button></Link>}
        {isDelivery && <Link href="/delivery"><Button className="mt-4 font-bold" variant="default"><Truck className="mr-2 h-4 w-4" />Ir al Panel de Repartidor</Button></Link>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><ShoppingBag className="h-4 w-4" /></div>
            <h2 className="text-2xl font-bold">Mis Pedidos</h2>
          </div>
          {orders.length === 0 ? (
            <Card className="border-dashed py-12 text-center"><CardContent className="space-y-4">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Aún no has realizado ningún pedido.</p>
              <Link href="/skating-store/catalogo"><Button variant="outline">Explorar Catálogo</Button></Link>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = STATUS_MAP[order.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
                const StatusIcon = status.icon;
                return (
                  <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 bg-muted/20">
                      <div><CardTitle className="text-base font-bold">Pedido #{order.id.slice(0, 8).toUpperCase()}</CardTitle><CardDescription>{new Date(order.created_at).toLocaleDateString()}</CardDescription></div>
                      <Badge variant="secondary" className={cn("flex items-center gap-1.5 py-1 px-3", status.color)}><StatusIcon className="h-3.5 w-3.5" />{status.label}</Badge>
                    </CardHeader>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">{order.items.length} {order.items.length === 1 ? "producto" : "productos"} • <span className="font-bold text-foreground">${order.total.toFixed(2)}</span></div>
                        <div className="flex items-center gap-2">
                          {canCancelByUser(order) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                              disabled={cancellingId === order.id}
                              onClick={() => handleOpenCancelModal(order)}
                            >
                              {cancellingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="mr-1 h-4 w-4" />Cancelar</>}
                            </Button>
                          )}
                          {canCancelByDelay(order) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                              disabled={cancellingId === order.id}
                              onClick={() => handleCancelByDelay(order.id)}
                            >
                              {cancellingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="mr-1 h-4 w-4" />Cancelar por retraso</>}
                            </Button>
                          )}
                          <Link href={`/skating-store/tracking/${order.id}`}><Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 font-bold">Rastrear Pedido<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><UserIcon className="h-4 w-4" /></div><h2 className="text-2xl font-bold">Información</h2></div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card><CardHeader className="pb-4"><CardTitle className="text-lg">Datos Personales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="first_name" className="text-xs">Nombre</Label><Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="h-9" /></div>
                  <div className="space-y-1.5"><Label htmlFor="last_name" className="text-xs">Apellido</Label><Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="h-9" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="phone" className="text-xs">Teléfono</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-9" /></div>
              </CardContent></Card>
            <Card><CardHeader className="pb-4"><CardTitle className="text-lg">Dirección</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="address" className="text-xs">Calle y Número</Label><Input id="address" value={formData.address_street} onChange={(e) => setFormData({ ...formData, address_street: e.target.value })} className="h-9" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="city" className="text-xs">Ciudad</Label><Input id="city" value={formData.address_city} onChange={(e) => setFormData({ ...formData, address_city: e.target.value })} className="h-9" /></div>
                  <div className="space-y-1.5"><Label htmlFor="postal_code" className="text-xs">C.P.</Label><Input id="postal_code" value={formData.address_postal_code} onChange={(e) => setFormData({ ...formData, address_postal_code: e.target.value })} className="h-9" /></div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t bg-muted/5"><Button type="submit" size="sm" className="w-full font-bold" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}</Button></CardFooter>
            </Card>
          </form>
          <div className="flex items-center gap-2 mb-2 pt-4"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Lock className="h-4 w-4" /></div><h2 className="text-2xl font-bold">Seguridad</h2></div>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <Card><CardHeader className="pb-4"><CardTitle className="text-lg">Cambiar Contraseña</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="new_password" className="text-xs">Nueva Contraseña</Label><Input id="new_password" type="password" value={passwordData.password} onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })} className="h-9" placeholder="******" /></div>
                <div className="space-y-1.5"><Label htmlFor="confirm_password" className="text-xs">Confirmar Contraseña</Label><Input id="confirm_password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="h-9" placeholder="******" /></div>
              </CardContent>
              <CardFooter className="pt-2 border-t bg-muted/5"><Button type="submit" size="sm" variant="outline" className="w-full font-bold" disabled={changingPassword}>{changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar Contraseña"}</Button></CardFooter>
            </Card>
          </form>
        </div>
      </div>

      <CancelOrderModal
        open={cancelModalOpen}
        onOpenChange={(open) => {
          setCancelModalOpen(open);
          if (!open) setCancelTargetOrder(null);
        }}
        role="USER"
        onConfirm={handleCancelConfirm}
        loading={cancellingId !== null}
      />
    </div>
  );
}
