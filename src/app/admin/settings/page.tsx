"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminSettingsPage() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    toast.success("Configuración guardada correctamente");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Perfil del Administrador</CardTitle>
          <CardDescription>Información de tu cuenta actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Rol</Label>
            <Input id="role" value={isAdmin ? 'ADMINISTRADOR' : 'USUARIO'} disabled readOnly />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="id">ID de Usuario</Label>
            <Input id="id" value={user?.id || ''} disabled readOnly className="font-mono text-xs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias del Sistema</CardTitle>
          <CardDescription>Configuración general de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Notificaciones por Email</Label>
              <CardDescription>
                Recibir correos cuando se generen nuevos pedidos.
              </CardDescription>
            </div>
            <Switch 
              checked={notifications} 
              onCheckedChange={setNotifications} 
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Modo Mantenimiento</Label>
              <CardDescription>
                Desactivar la tienda temporalmente para los clientes.
              </CardDescription>
            </div>
            <Switch 
              checked={maintenanceMode} 
              onCheckedChange={setMaintenanceMode} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Guardar Cambios</Button>
      </div>
    </div>
  );
}
