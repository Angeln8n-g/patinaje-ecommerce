"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, ShieldCheck, LogOut, Phone, MapPin } from "lucide-react";

export default function DeliveryProfilePage() {
  const { user, signOut } = useAuth();

  if (!user) return null;

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
            <div className="h-20 w-20 rounded-full bg-primary-foreground/20 flex items-center justify-center border-4 border-primary-foreground/30 shadow-xl">
              <User className="h-10 w-10" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">{user.email?.split('@')[0]}</CardTitle>
              <CardDescription className="text-primary-foreground/80 flex items-center justify-center gap-1.5 mt-1">
                <ShieldCheck className="h-4 w-4" />
                Repartidor Verificado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
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
