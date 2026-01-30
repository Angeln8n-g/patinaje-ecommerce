"use client";

import { useEffect, useState } from "react";
import { getCategories, createCategory, deleteCategory } from "@/lib/skating-store/content-actions";
import { Category } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Package, Component as ComponentIcon, Footprints, Shield, Disc, Shirt, Image as ImageIcon } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "", icon_name: "", icon_url: "" });
  const iconOptions = [
    { label: "Paquete", value: "Package", icon: <Package className="h-5 w-5" /> },
    { label: "Componentes/Bases", value: "Component", icon: <ComponentIcon className="h-5 w-5" /> },
    { label: "Botas/Patines", value: "Footprints", icon: <Footprints className="h-5 w-5" /> },
    { label: "Protecciones", value: "Shield", icon: <Shield className="h-5 w-5" /> },
    { label: "Ruedas", value: "Disc", icon: <Disc className="h-5 w-5" /> },
    { label: "Ropa", value: "Shirt", icon: <Shirt className="h-5 w-5" /> },
  ];

  const loadData = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast.error("Nombre y Slug son obligatorios");
      return;
    }
    if (!newCategory.icon_name && !newCategory.icon_url) {
      toast.error("Selecciona un icono o coloca una URL de icono");
      return;
    }

    try {
      await createCategory(newCategory);
      toast.success("Categoría creada");
      setIsCreateOpen(false);
      setNewCategory({ name: "", slug: "", description: "", icon_name: "", icon_url: "" });
      loadData();
    } catch (error) {
      toast.error("Error al crear categoría");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro? Esto podría afectar a productos existentes.")) return;
    
    try {
      await deleteCategory(id);
      toast.success("Categoría eliminada");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar categoría");
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    setNewCategory(prev => ({ ...prev, name, slug }));
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
        <h1 className="text-3xl font-bold">Categorías</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Categoría</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                  value={newCategory.name} 
                  onChange={handleNameChange}
                  placeholder="Ej. Patines Urbanos"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input 
                  value={newCategory.slug} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="ej-patines-urbanos"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input 
                  value={newCategory.description} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <div className="flex items-center gap-3">
                  <select
                    className="border rounded-md px-3 py-2 bg-background"
                    value={newCategory.icon_name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, icon_name: e.target.value }))}
                  >
                    <option value="">Selecciona un icono</option>
                    {iconOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center">
                    {newCategory.icon_name === "Package" && <Package className="h-5 w-5" />}
                    {newCategory.icon_name === "Component" && <ComponentIcon className="h-5 w-5" />}
                    {newCategory.icon_name === "Footprints" && <Footprints className="h-5 w-5" />}
                    {newCategory.icon_name === "Shield" && <Shield className="h-5 w-5" />}
                    {newCategory.icon_name === "Disc" && <Disc className="h-5 w-5" />}
                    {newCategory.icon_name === "Shirt" && <Shirt className="h-5 w-5" />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL de Icono (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="https://.../icon.png"
                    value={newCategory.icon_url}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, icon_url: e.target.value }))}
                  />
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
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
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Icono</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="font-mono text-xs">{cat.slug}</TableCell>
                <TableCell>{cat.description || '-'}</TableCell>
                <TableCell>
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {cat.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.icon_url} alt={cat.name} className="h-8 w-8 object-cover" />
                    ) : (
                      <>
                        {cat.icon_name === "Package" && <Package className="h-5 w-5" />}
                        {cat.icon_name === "Component" && <ComponentIcon className="h-5 w-5" />}
                        {cat.icon_name === "Footprints" && <Footprints className="h-5 w-5" />}
                        {cat.icon_name === "Shield" && <Shield className="h-5 w-5" />}
                        {cat.icon_name === "Disc" && <Disc className="h-5 w-5" />}
                        {cat.icon_name === "Shirt" && <Shirt className="h-5 w-5" />}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
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
