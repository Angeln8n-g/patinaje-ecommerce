"use client";

import { useEffect, useState } from "react";
import { Banner, PromoWaitlistEntry } from "@/types/skating-store";
import { getPromotions, getPromoWaitlist, activatePromotion, updatePromoStatus } from "@/lib/skating-store/promotion-actions";
import { getBanners } from "@/lib/skating-store/content-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2, Bell, BellRing, Users, Send, Rocket, Clock, CheckCircle2,
  XCircle, Eye, Megaphone, AlertTriangle, Calendar
} from "lucide-react";
import Image from "next/image";

const statusConfig = {
  upcoming: { label: "Próximamente", color: "bg-amber-100 text-amber-800", icon: Clock },
  active: { label: "Activa", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  expired: { label: "Expirada", color: "bg-gray-100 text-gray-600", icon: XCircle },
  none: { label: "Sin promo", color: "bg-slate-100 text-slate-600", icon: Megaphone },
};

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Banner[]>([]);
  const [allBanners, setAllBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [waitlist, setWaitlist] = useState<PromoWaitlistEntry[]>([]);
  const [waitlistBanner, setWaitlistBanner] = useState<Banner | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState("");

  const loadData = async () => {
    try {
      const [promosData, bannersData] = await Promise.all([
        getPromotions(),
        getBanners(),
      ]);
      setPromos(promosData);
      // Banners sin promo asignada (para el selector)
      const promoIds = new Set(promosData.map(p => p.id));
      setAllBanners(bannersData.filter(b => !promoIds.has(b.id)));
    } catch {
      toast.error("Error al cargar promociones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleViewWaitlist = async (banner: Banner) => {
    setWaitlistBanner(banner);
    setWaitlistOpen(true);
    try {
      const data = await getPromoWaitlist(banner.id);
      setWaitlist(data);
    } catch {
      toast.error("Error al cargar lista de espera");
    }
  };

  const handleActivate = async (bannerId: string) => {
    setActivating(bannerId);
    try {
      const result = await activatePromotion(bannerId);
      toast.success(
        `Promoción activada. ${result.emails_sent} correo(s) enviado(s) de ${result.total_subscribers} inscrito(s).`
      );
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al activar promoción");
    } finally {
      setActivating(null);
    }
  };

  const handleAssignPromo = async () => {
    if (!selectedBannerId) return;
    try {
      await updatePromoStatus(selectedBannerId, { promo_status: "upcoming" });
      toast.success("Banner marcado como próxima promoción");
      setAssignOpen(false);
      setSelectedBannerId("");
      loadData();
    } catch {
      toast.error("Error al asignar promoción");
    }
  };

  const handleExpire = async (bannerId: string) => {
    try {
      await updatePromoStatus(bannerId, { promo_status: "expired" });
      toast.success("Promoción marcada como expirada");
      loadData();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const upcoming = promos.filter(p => p.promo_status === "upcoming");
  const active = promos.filter(p => p.promo_status === "active");
  const expired = promos.filter(p => p.promo_status === "expired");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promociones y Especiales</h1>
          <p className="text-muted-foreground mt-1">Gestiona próximas promociones y listas de espera</p>
        </div>
        <Button onClick={() => setAssignOpen(true)}>
          <Megaphone className="mr-2 h-4 w-4" />
          Nueva Promoción
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Próximamente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Rocket className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{active.length}</p>
                <p className="text-xs text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Users className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{promos.reduce((sum, p) => sum + (Number(p.waitlist_count) || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Total inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Send className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{promos.reduce((sum, p) => sum + (Number(p.notified_count) || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Correos enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Promos */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" /> Próximas Promociones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(promo => (
              <Card key={promo.id} className="overflow-hidden border-amber-200">
                <div className="relative h-40 w-full">
                  <Image
                    src={promo.image_url || "https://placehold.co/400x200/png"}
                    alt={promo.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                    <Clock className="h-3 w-3 mr-1" /> Próximamente
                  </Badge>
                </div>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-bold text-lg">{promo.title}</h3>
                  {promo.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{promo.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-purple-600">
                      <Users className="h-4 w-4" /> {promo.waitlist_count || 0} inscritos
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewWaitlist(promo)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Lista
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleActivate(promo.id)}
                      disabled={activating === promo.id}
                    >
                      {activating === promo.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Rocket className="mr-1 h-3 w-3" />
                      )}
                      Activar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Promos */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-500" /> Promociones Activas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(promo => (
              <Card key={promo.id} className="overflow-hidden border-green-200">
                <div className="relative h-40 w-full">
                  <Image
                    src={promo.image_url || "https://placehold.co/400x200/png"}
                    alt={promo.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Activa
                  </Badge>
                </div>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-bold text-lg">{promo.title}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-purple-600">
                      <Users className="h-4 w-4" /> {promo.waitlist_count || 0} inscritos
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <Send className="h-4 w-4" /> {promo.notified_count || 0} notificados
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewWaitlist(promo)}>
                      <Eye className="mr-1 h-3 w-3" /> Lista
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleExpire(promo.id)}>
                      <XCircle className="mr-1 h-3 w-3" /> Expirar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expired Promos */}
      {expired.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-400" /> Promociones Expiradas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expired.map(promo => (
              <Card key={promo.id} className="overflow-hidden opacity-60">
                <div className="relative h-32 w-full">
                  <Image
                    src={promo.image_url || "https://placehold.co/400x200/png"}
                    alt={promo.title}
                    fill
                    className="object-cover grayscale"
                    unoptimized
                  />
                  <Badge className="absolute top-2 right-2 bg-gray-500 text-white">Expirada</Badge>
                </div>
                <CardContent className="pt-3">
                  <h3 className="font-semibold">{promo.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {promo.waitlist_count || 0} inscritos · {promo.notified_count || 0} notificados
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {promos.length === 0 && (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay promociones configuradas</h3>
          <p className="text-muted-foreground mb-4">
            Asigna un banner existente como próxima promoción para que los usuarios puedan inscribirse.
          </p>
          <Button onClick={() => setAssignOpen(true)}>
            <Megaphone className="mr-2 h-4 w-4" /> Crear Primera Promoción
          </Button>
        </Card>
      )}

      {/* Assign Banner as Promo Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Promoción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecciona un banner existente para marcarlo como próxima promoción. Los usuarios podrán inscribirse para recibir un aviso cuando la actives.
            </p>
            {allBanners.length === 0 ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay banners disponibles. Crea uno primero en la sección de Banners.
                </p>
              </div>
            ) : (
              <>
                <Select value={selectedBannerId} onValueChange={setSelectedBannerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allBanners.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="flex items-center gap-2">
                          <Megaphone className="h-3 w-3" /> {b.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBannerId && (
                  <div className="rounded-lg overflow-hidden border">
                    <div className="relative h-32 w-full">
                      <Image
                        src={allBanners.find(b => b.id === selectedBannerId)?.image_url || ""}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={handleAssignPromo} disabled={!selectedBannerId}>
                  <Bell className="mr-2 h-4 w-4" /> Marcar como Próxima Promoción
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Waitlist Viewer Dialog */}
      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Espera: {waitlistBanner?.title}
            </DialogTitle>
          </DialogHeader>
          {waitlist.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Aún no hay inscritos en esta promoción</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Notificado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>{entry.name || entry.first_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("es-DO")}
                    </TableCell>
                    <TableCell>
                      {entry.notified ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
