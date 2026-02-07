"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, ShieldCheck, LogOut, Phone, MapPin, Star, AlertTriangle, TrendingUp, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { getDeliveryManStats } from "@/lib/skating-store/rating-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DeliveryProfilePage() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getDeliveryManStats(user.id).then(setStats);
    }
  }, [user]);

  if (!user) return null;

  const getLevelInfo = (rating: number) => {
    if (rating >= 4.8) return { label: "Elite", color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50", icon: Award };
    if (rating >= 4.5) return { label: "Profesional", color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", icon: ShieldCheck };
    if (rating >= 4.0) return { label: "Estándar", color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50", icon: User };
    return { label: "En Riesgo", color: "bg-red-500", text: "text-red-600", bg: "bg-red-50", icon: AlertTriangle };
  };

  const level = stats ? getLevelInfo(stats.averageRating) : null;
  const LevelIcon = level?.icon || User;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold">Mi Perfil</h2>
      </div>

      <Card className="overflow-hidden border-none shadow-md">
        <CardHeader className="bg-primary text-primary-foreground pb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary-foreground/20 flex items-center justify-center border-4 border-primary-foreground/30 shadow-xl">
                <User className="h-10 w-10" />
              </div>
              {level && (
                <div className={cn("absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white shadow-sm", level.bg)}>
                  <LevelIcon className={cn("h-4 w-4", level.text)} />
                </div>
              )}
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">{user.email?.split('@')[0]}</CardTitle>
              {stats && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="font-bold px-3 py-1 bg-white/20 hover:bg-white/30 text-white border-none">
                    <Star className="w-3 h-3 mr-1 fill-white" />
                    {stats.averageRating.toFixed(1)}
                  </Badge>
                  <span className="text-sm text-primary-foreground/80">
                    ({stats.totalRatings} reseñas)
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          {/* Stats Section */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className={cn("p-4 rounded-2xl border flex flex-col items-center text-center gap-2", level?.bg, "border-transparent")}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Nivel</p>
                <p className={cn("text-lg font-black", level?.text)}>{level?.label}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col items-center text-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entregas</p>
                <p className="text-lg font-black">{stats.totalRatings}</p>
              </div>
            </div>
          )}

          {/* Rating Warning */}
          {stats && stats.averageRating < 4.0 && stats.totalRatings > 5 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 text-sm">Atención requerida</h4>
                <p className="text-xs text-red-700 mt-1">
                  Tu calificación está por debajo del estándar (4.0). Mantén un buen servicio para evitar restricciones en tu cuenta.
                </p>
              </div>
            </div>
          )}

          {/* Rating Priority Info */}
          {stats && stats.averageRating >= 4.5 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 items-start">
              <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">Prioridad de Asignación</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  ¡Excelente trabajo! Tu alta calificación te da prioridad para recibir nuevos pedidos.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-muted-foreground/10">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-muted-foreground/10">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rol de Usuario</p>
                <p className="font-semibold">DELIVERY</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
             <p className="text-sm text-muted-foreground text-center px-4">
               Como repartidor, tienes acceso a la gestión de envíos, tracking de ubicación y validación de cobros en efectivo.
             </p>
             <Button 
               variant="destructive" 
               className="w-full h-12 rounded-xl font-bold shadow-lg shadow-destructive/20" 
               onClick={() => signOut()}
             >
               <LogOut className="mr-2 h-5 w-5" />
               Cerrar Sesión
             </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center gap-2">
          <Phone className="h-6 w-6 text-blue-600" />
          <p className="text-xs font-bold text-blue-900">Soporte</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center text-center gap-2">
          <MapPin className="h-6 w-6 text-amber-600" />
          <p className="text-xs font-bold text-amber-900">Zonas</p>
        </div>
      </div>
    </div>
  );
}
