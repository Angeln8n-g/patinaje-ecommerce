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
import { authFetch } from "@/lib/api/client";

export default function AdminSettingsPage() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [fiscalEnabled, setFiscalEnabled] = useState(true);
  const [carouselSpeed, setCarouselSpeed] = useState(40); // Default 40s
  const [flashSaleEnd, setFlashSaleEnd] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cancellationWindow, setCancellationWindow] = useState(30);
  const [cancellationWindowError, setCancellationWindowError] = useState("");
  const [isSavingCancellation, setIsSavingCancellation] = useState(false);

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
        if (typeof settings.data.fiscal_enabled === 'boolean') {
          setFiscalEnabled(settings.data.fiscal_enabled);
        }
      }
    });

    // Load cancellation window config
    authFetch<{ cancellation_window_minutes: number }>("/api/cancellations/config")
      .then((config) => {
        if (typeof config.cancellation_window_minutes === "number") {
          setCancellationWindow(config.cancellation_window_minutes);
        }
      })
      .catch(() => {
        // Default to 30 if config not available
        setCancellationWindow(30);
      });
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        carousel_speed: carouselSpeed,
        flash_sale_end: flashSaleEnd,
        fiscal_enabled: fiscalEnabled
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

  const handleSaveCancellationWindow = async () => {
    if (cancellationWindow < 5 || cancellationWindow > 1440) {
      setCancellationWindowError("La ventana debe estar entre 5 y 1440 minutos");
      return;
    }
    setCancellationWindowError("");
    setIsSavingCancellation(true);
    try {
      await authFetch("/api/cancellations/config", {
        method: "PUT",
        body: { cancellation_window_minutes: cancellationWindow },
      });
      toast.success("Ventana de cancelación actualizada");
    } catch (error) {
      toast.error("Error al guardar: " + ((error as any)?.message || "Desconocido"));
    } finally {
      setIsSavingCancellation(false);
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
          <CardTitle>Facturación Fiscal</CardTitle>
          <CardDescription>Controla el módulo de comprobantes fiscales electrónicos (e-CF).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label className="text-base">Habilitar Facturación Fiscal</Label>
              <CardDescription>
                Al desactivar, se oculta la sección fiscal del panel y se bloquea la emisión de comprobantes. Las órdenes y facturación regular no se ven afectadas.
              </CardDescription>
            </div>
            <Switch
              checked={fiscalEnabled}
              onCheckedChange={setFiscalEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ventana de Cancelación</CardTitle>
          <CardDescription>
            Tiempo máximo en minutos que un usuario tiene para cancelar su pedido después de realizarlo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="cancellation-window">Minutos permitidos (5 - 1440)</Label>
            <Input
              id="cancellation-window"
              type="number"
              min={5}
              max={1440}
              value={cancellationWindow}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCancellationWindow(val);
                if (val < 5 || val > 1440) {
                  setCancellationWindowError("La ventana debe estar entre 5 y 1440 minutos");
                } else {
                  setCancellationWindowError("");
                }
              }}
            />
            {cancellationWindowError && (
              <p className="text-sm text-red-500">{cancellationWindowError}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveCancellationWindow}
              disabled={isSavingCancellation || !!cancellationWindowError}
            >
              {isSavingCancellation ? "Guardando..." : "Guardar Ventana"}
            </Button>
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
