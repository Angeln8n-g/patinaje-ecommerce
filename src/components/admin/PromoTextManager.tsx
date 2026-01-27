"use client";

import { useEffect, useState } from "react";
import { getActivePromoTextBanner, updatePromoTextBanner } from "@/lib/skating-store/content-actions";
import { PromoTextBanner } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { DeliveryPromoBanner } from "@/components/skating-store/home/DeliveryPromoBanner";

export function PromoTextManager() {
  const [promo, setPromo] = useState<PromoTextBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    prefix_text: "Delivery is",
    highlight_text: "50%",
    suffix_text: "cheaper",
    bg_color: "#E9F7E8",
    image_url: "",
  });

  useEffect(() => {
    loadPromo();
  }, []);

  const loadPromo = async () => {
    try {
      const data = await getActivePromoTextBanner();
      if (data) {
        setPromo(data);
        setFormData({
          prefix_text: data.prefix_text,
          highlight_text: data.highlight_text,
          suffix_text: data.suffix_text,
          bg_color: data.bg_color,
          image_url: data.image_url || "",
        });
      }
    } catch (error) {
      toast.error("Error al cargar la promoción");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!promo) return;
    
    setSaving(true);
    try {
      await updatePromoTextBanner(promo.id, formData);
      toast.success("Promoción actualizada");
      setPromo({ ...promo, ...formData });
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!promo) {
    return <div className="text-center py-10">No hay configuración de promoción inicializada. Contacta al soporte.</div>;
  }

  // Preview object
  const previewPromo: PromoTextBanner = {
    ...promo,
    ...formData,
    active: true // For preview purposes
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>Edita el texto y estilo del banner de envíos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Prefijo</Label>
                <Input 
                  value={formData.prefix_text} 
                  onChange={(e) => setFormData({...formData, prefix_text: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Resaltado (Píldora)</Label>
                <Input 
                  value={formData.highlight_text} 
                  onChange={(e) => setFormData({...formData, highlight_text: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Sufijo</Label>
                <Input 
                  value={formData.suffix_text} 
                  onChange={(e) => setFormData({...formData, suffix_text: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color de Fondo (Hex)</Label>
              <div className="flex gap-2">
                <Input 
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer"
                  value={formData.bg_color} 
                  onChange={(e) => setFormData({...formData, bg_color: e.target.value})}
                />
                <Input 
                  value={formData.bg_color} 
                  onChange={(e) => setFormData({...formData, bg_color: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL de Fondo (Imagen, GIF o Video)</Label>
              <Input 
                value={formData.image_url} 
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://... (Dejar vacío para usar formas abstractas)"
              />
              <p className="text-xs text-muted-foreground">
                Soporta .jpg, .png, .gif, .mp4, .webm. Si se establece, reemplaza el fondo y las formas.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Vista Previa</h3>
          <div className="border rounded-xl p-4 bg-background">
             <DeliveryPromoBanner promo={previewPromo} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Así se verá en la página de inicio.
          </p>
        </div>
      </div>
    </div>
  );
}
