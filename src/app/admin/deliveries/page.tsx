"use client";

import { useEffect, useState, Fragment } from "react";
import { getDeliveryMenStats } from "@/lib/skating-store/delivery-actions";
import { sendDeliveryAlert } from "@/lib/skating-store/notification-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, Star, Award, DollarSign, Package, Phone, Mail, MapPin,
  MessageSquare, Send, Wifi, WifiOff, Clock, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";

function timeAgo(dateStr: string): { text: string; isOnline: boolean } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 5) return { text: "En línea", isOnline: true };
  if (mins < 60) return { text: `Hace ${mins} min`, isOnline: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `Hace ${hours}h`, isOnline: false };
  const days = Math.floor(hours / 24);
  return { text: `Hace ${days}d`, isOnline: false };
}

export default function DeliveriesPage() {
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alertTarget, setAlertTarget] = useState<any | null>(null);
  const [alertSubject, setAlertSubject] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadData = async () => {
    try {
      const data = await getDeliveryMenStats();
      setDeliveryMen(data);
    } catch {
      toast.error("Error al cargar repartidores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAlert = (dm: any, preset?: { subject: string; message: string }) => {
    setAlertTarget(dm);
    setAlertSubject(preset?.subject || "");
    setAlertMessage(preset?.message || "");
  };

  const handleSendAlert = async () => {
    if (!alertTarget || !alertSubject.trim() || !alertMessage.trim()) {
      toast.error("Completa el asunto y el mensaje");
      return;
    }
    setIsSending(true);
    try {
      const name = alertTarget.first_name
        ? `${alertTarget.first_name} ${alertTarget.last_name || ""}`.trim()
        : alertTarget.email.split("@")[0];
      const res = await sendDeliveryAlert({
        deliveryEmail: alertTarget.email,
        deliveryName: name,
        subject: alertSubject,
        message: alertMessage,
      });
      if (res.success) {
        toast.success(`Notificación enviada a ${name}`);
        setAlertTarget(null);
      } else {
        toast.error("Error al enviar: " + (res.error || ""));
      }
    } catch {
      toast.error("Error al enviar notificación");
    } finally {
      setIsSending(false);
    }
  };

  const getDisplayName = (dm: any) =>
    dm.first_name ? `${dm.first_name} ${dm.last_name || ""}`.trim() : dm.email.split("@")[0];

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const topPerformer = deliveryMen[0];
  const onlineCount = deliveryMen.filter(dm => dm.lastLocation && timeAgo(dm.lastLocation.updated_at).isOnline).length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Repartidores</h1>
          <p className="text-muted-foreground">Ranking, contacto y monitoreo en tiempo real</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">Gestionar Roles</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Repartidor</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {topPerformer ? (
              <>
                <div className="text-xl font-bold truncate">{getDisplayName(topPerformer)}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-foreground">{topPerformer.avgRating.toFixed(1)}</span> rating
                </div>
              </>
            ) : <p className="text-muted-foreground text-sm">Sin datos</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conectados Ahora</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount} <span className="text-sm font-normal text-muted-foreground">/ {deliveryMen.length}</span></div>
            <p className="text-xs text-muted-foreground">Última ubicación &lt; 5 min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Entregadas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(deliveryMen.reduce((a, c) => a + (c.totalSales || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Entregados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryMen.reduce((a, c) => a + c.deliveredCount, 0)}</div>
            <p className="text-xs text-muted-foreground">Completados exitosamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Men Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Ventas</TableHead>
              <TableHead>Entregas</TableHead>
              <TableHead>Activos</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryMen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">No hay repartidores registrados.</TableCell>
              </TableRow>
            ) : (
              deliveryMen.map((dm, index) => {
                const isExpanded = expandedId === dm.id;
                const loc = dm.lastLocation;
                const connection = loc ? timeAgo(loc.updated_at) : null;
                const name = getDisplayName(dm);

                let rankColor = "text-muted-foreground";
                if (index === 0) rankColor = "text-yellow-500 font-bold text-lg";
                if (index === 1) rankColor = "text-slate-400 font-bold text-lg";
                if (index === 2) rankColor = "text-amber-700 font-bold text-lg";

                let levelBadge = { label: "En Riesgo", color: "bg-red-100 text-red-800" };
                if (dm.avgRating >= 4.8) levelBadge = { label: "Elite", color: "bg-purple-100 text-purple-800 border-purple-200" };
                else if (dm.avgRating >= 4.5) levelBadge = { label: "Profesional", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
                else if (dm.avgRating >= 4.0) levelBadge = { label: "Estándar", color: "bg-blue-100 text-blue-800 border-blue-200" };

                return (
                  <Fragment key={dm.id}>
                    <TableRow className={cn("cursor-pointer hover:bg-muted/50", isExpanded && "bg-muted/30")} onClick={() => setExpandedId(isExpanded ? null : dm.id)}>
                      <TableCell className={cn("text-center", rankColor)}>#{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{name}</span>
                          <span className="text-xs text-muted-foreground">{dm.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {connection ? (
                          <div className="flex items-center gap-1.5">
                            {connection.isOnline ? (
                              <Wifi className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className={cn("text-xs font-medium", connection.isOnline ? "text-green-600" : "text-muted-foreground")}>
                              {connection.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin ubicación</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={levelBadge.color}>{levelBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className={cn("h-4 w-4", dm.avgRating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                          <span className="font-bold">{dm.avgRating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({dm.ratingCount})</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{formatCurrency(dm.totalSales || 0)}</TableCell>
                      <TableCell>{dm.deliveredCount}</TableCell>
                      <TableCell>
                        {dm.activeShipments > 0 ? (
                          <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800">{dm.activeShipments} en curso</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost" size="icon" title="Enviar notificación"
                            onClick={() => openAlert(dm, {
                              subject: "Tienes un pedido asignado",
                              message: "Se te ha asignado un nuevo pedido. Por favor, abre la app para ver los detalles y comenzar la entrega.",
                            })}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          {dm.phone && (
                            <a href={`https://wa.me/${dm.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon" title="WhatsApp">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </Button>
                            </a>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/20 p-0">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Contact Info */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contacto</p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={`mailto:${dm.email}`} className="text-primary hover:underline truncate">{dm.email}</a>
                                </div>
                                {dm.phone ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <a href={`tel:${dm.phone}`} className="text-primary hover:underline">{dm.phone}</a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Sin teléfono registrado</p>
                                )}
                                {dm.address_street ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{dm.address_street}{dm.address_city ? `, ${dm.address_city}` : ""}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Sin dirección registrada</p>
                                )}
                              </div>
                            </div>
                            {/* Location */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Última Ubicación</p>
                              {loc ? (
                                <div className="space-y-2">
                                  <p className="text-sm flex items-center gap-2">
                                    {connection?.isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                                    {connection?.text} — {new Date(loc.updated_at).toLocaleString("es-DO")}
                                  </p>
                                  <a
                                    href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Ver en Google Maps
                                  </a>
                                </div>
                              ) : <p className="text-sm text-muted-foreground">No ha reportado ubicación</p>}
                            </div>
                            {/* Quick Actions */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Acciones Rápidas</p>
                              <div className="flex flex-col gap-2">
                                <Button size="sm" variant="outline" className="justify-start" onClick={() => openAlert(dm, {
                                  subject: "Tienes un pedido asignado",
                                  message: "Se te ha asignado un nuevo pedido. Por favor, abre la app para ver los detalles y comenzar la entrega.",
                                })}>
                                  <Send className="mr-2 h-4 w-4" /> Notificar pedido asignado
                                </Button>
                                <Button size="sm" variant="outline" className="justify-start" onClick={() => openAlert(dm)}>
                                  <Mail className="mr-2 h-4 w-4" /> Enviar mensaje personalizado
                                </Button>
                                {dm.phone && (
                                  <a href={`tel:${dm.phone}`}>
                                    <Button size="sm" variant="outline" className="justify-start w-full">
                                      <Phone className="mr-2 h-4 w-4" /> Llamar
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Send Alert Dialog */}
      <Dialog open={!!alertTarget} onOpenChange={(open) => { if (!open) setAlertTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Notificar a {alertTarget ? getDisplayName(alertTarget) : ""}
            </DialogTitle>
            <DialogDescription>
              Se enviará un correo a {alertTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                value={alertSubject}
                onChange={(e) => setAlertSubject(e.target.value)}
                placeholder="Ej: Tienes un pedido asignado"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Escribe el mensaje para el repartidor..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAlertTarget(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSendAlert} disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
