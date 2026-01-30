"use client";

import { useEffect, useState } from "react";
import { getStaticContent, updateStaticContent } from "@/lib/skating-store/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function PagesAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [aboutData, setAboutData] = useState({
    title: "",
    history_title: "",
    history_content: "",
    mission_title: "",
    mission_content: "",
    image_url: ""
  });

  const [contactData, setContactData] = useState({
    title: "",
    address: "",
    phone: "",
    email: ""
  });
  
  const [siteSettings, setSiteSettings] = useState({
    store_title: "",
    logo_url: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [about, contact, settings] = await Promise.all([
        getStaticContent("about-us"),
        getStaticContent("contact-info"),
        getStaticContent("site-settings")
      ]);

      if (about) setAboutData(about.data);
      if (contact) setContactData(contact.data);
      if (settings) setSiteSettings(settings.data);
    } catch (error) {
      toast.error("Error al cargar contenido");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    setSaving(true);
    try {
      await updateStaticContent("about-us", aboutData);
      toast.success("Página 'Sobre Nosotros' actualizada");
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      await updateStaticContent("contact-info", contactData);
      toast.success("Página 'Contacto' actualizada");
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateStaticContent("site-settings", siteSettings);
      toast.success("Configuración de la página actualizada");
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Páginas</h1>
      </div>

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="about">Sobre Nosotros</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Editar Sobre Nosotros</CardTitle>
              <CardDescription>Gestiona el contenido de la página de historia y misión.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título Principal</Label>
                <Input 
                  value={aboutData.title} 
                  onChange={(e) => setAboutData({...aboutData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Título Historia</Label>
                <Input 
                  value={aboutData.history_title} 
                  onChange={(e) => setAboutData({...aboutData, history_title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Contenido Historia</Label>
                <Textarea 
                  className="min-h-[100px]"
                  value={aboutData.history_content} 
                  onChange={(e) => setAboutData({...aboutData, history_content: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>URL Imagen Equipo</Label>
                <Input 
                  value={aboutData.image_url} 
                  onChange={(e) => setAboutData({...aboutData, image_url: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Título Misión</Label>
                <Input 
                  value={aboutData.mission_title} 
                  onChange={(e) => setAboutData({...aboutData, mission_title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Contenido Misión</Label>
                <Textarea 
                  className="min-h-[100px]"
                  value={aboutData.mission_content} 
                  onChange={(e) => setAboutData({...aboutData, mission_content: e.target.value})}
                />
              </div>

              <Button onClick={handleSaveAbout} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Editar Contacto</CardTitle>
              <CardDescription>Actualiza la información de contacto mostrada a los clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título Principal</Label>
                <Input 
                  value={contactData.title} 
                  onChange={(e) => setContactData({...contactData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dirección Física</Label>
                <Textarea 
                  value={contactData.address} 
                  onChange={(e) => setContactData({...contactData, address: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  value={contactData.phone} 
                  onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input 
                  value={contactData.email} 
                  onChange={(e) => setContactData({...contactData, email: e.target.value})}
                />
              </div>

              <Button onClick={handleSaveContact} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de la Página</CardTitle>
              <CardDescription>Edita el título mostrado en la tienda y la imagen del logo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título de la Tienda</Label>
                <Input 
                  value={siteSettings.store_title} 
                  onChange={(e) => setSiteSettings({ ...siteSettings, store_title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>URL del Logo</Label>
                <Input 
                  value={siteSettings.logo_url} 
                  onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                />
              </div>
              
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
