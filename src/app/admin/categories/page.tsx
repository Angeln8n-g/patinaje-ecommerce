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
import { Loader2, Trash2, Plus } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "" });

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

    try {
      await createCategory(newCategory);
      toast.success("Categoría creada");
      setIsCreateOpen(false);
      setNewCategory({ name: "", slug: "", description: "" });
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
