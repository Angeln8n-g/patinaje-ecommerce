"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { getStaticContentClient, updateStaticContentClient } from "@/lib/skating-store/supabase-queries";

export default function AdminSettingsPage() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [carouselSpeed, setCarouselSpeed] = useState(40); // Default 40s
  const [flashSaleEnd, setFlashSaleEnd] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load settings
    getStaticContentClient('site-settings').then(settings => {
      if (settings?.data) {
        if (typeof settings.data.carousel_speed === 'number') {
          setCarouselSpeed(settings.data.carousel_speed);
        }
        if (typeof settings.data.flash_sale_end === 'string') {
          setFlashSaleEnd(settings.data.flash_sale_end);
        }
        // Load other settings if they existed in DB
      }
    });
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        carousel_speed: carouselSpeed,
        flash_sale_end: flashSaleEnd
      };
      
      await updateStaticContentClient('site-settings', updateData);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error detailed:", JSON.stringify(error, null, 2));
      console.error("Error original:", error);
      toast.error("Error al guardar la configuración: " + (error as any)?.message || "Desconocido");
    } finally {
      setIsLoading(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle>Personalización de Tienda</CardTitle>
          <CardDescription>Ajustes visuales y de comportamiento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="carousel-speed">Velocidad del Carrusel de Categorías (segundos)</Label>
            <CardDescription>Tiempo que tarda en dar una vuelta completa. Menor número = más rápido.</CardDescription>
            <Input 
              id="carousel-speed" 
              type="number" 
              min="5" 
              max="200"
              value={carouselSpeed} 
              onChange={(e) => setCarouselSpeed(Number(e.target.value))} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flash-sale-end">Fin de la Oferta Flash (Fecha y Hora)</Label>
            <CardDescription>Establece cuándo termina la cuenta regresiva.</CardDescription>
            <Input 
              id="flash-sale-end" 
              type="datetime-local" 
              value={flashSaleEnd} 
              onChange={(e) => setFlashSaleEnd(e.target.value)} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
