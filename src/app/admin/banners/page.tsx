"use client";

import { useEffect, useState } from "react";
import { getBanners, createBanner, deleteBanner, updateBanner } from "@/lib/skating-store/content-actions";
import { Banner } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ExternalLink } from "lucide-react";

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBanner, setNewBanner] = useState<{
    title: string;
    description: string;
    image_url: string;
    link_url: string;
    active: boolean;
    display_order: number;
  }>({ 
    title: "", 
    description: "",
    image_url: "", 
    link_url: "", 
    active: true, 
    display_order: 0 
  });

  const loadData = async () => {
    try {
      const data = await getBanners();
      setBanners(data);
    } catch (error) {
      toast.error("Error al cargar banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!newBanner.title || !newBanner.image_url) {
      toast.error("Título e Imagen son obligatorios");
      return;
    }

    try {
      await createBanner(newBanner);
      toast.success("Banner creado");
      setIsCreateOpen(false);
      setNewBanner({ title: "", description: "", image_url: "", link_url: "", active: true, display_order: 0 });
      loadData();
    } catch (error) {
      toast.error("Error al crear banner");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este banner?")) return;
    
    try {
      await deleteBanner(id);
      toast.success("Banner eliminado");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar banner");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateBanner(id, { active: !currentStatus });
      toast.success("Estado actualizado");
      loadData();
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banners Promocionales</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  value={newBanner.title} 
                  onChange={(e) => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Oferta de Verano"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input 
                  value={newBanner.description} 
                  onChange={(e) => setNewBanner(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descuentos de hasta 50%"
                />
              </div>
              <div className="space-y-2">
                <Label>URL de Imagen</Label>
                <Input 
                  value={newBanner.image_url} 
                  onChange={(e) => setNewBanner(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Link de Destino (Opcional)</Label>
                <Input 
                  value={newBanner.link_url} 
                  onChange={(e) => setNewBanner(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="/skating-store/catalogo"
                />
              </div>
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input 
                  type="number"
                  value={newBanner.display_order} 
                  onChange={(e) => setNewBanner(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch 
                  checked={newBanner.active} 
                  onCheckedChange={(checked) => setNewBanner(prev => ({ ...prev, active: checked }))} 
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>{banner.display_order}</TableCell>
                <TableCell>
                  <img 
                    src={banner.image_url} 
                    alt={banner.title} 
                    className="h-10 w-20 object-cover rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{banner.title}</TableCell>
                <TableCell>
                  {banner.link_url && (
                    <a href={banner.link_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={banner.active} 
                    onCheckedChange={() => handleToggleActive(banner.id, banner.active)} 
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
