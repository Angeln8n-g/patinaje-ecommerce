"use client";

import { useEffect, useState, useMemo } from "react";
import { getBanners, createBanner, deleteBanner, updateBanner } from "@/lib/skating-store/content-actions";
import { getProducts, getCategories } from "@/lib/skating-store/supabase-queries";
import { Banner, Product, Category } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ExternalLink, Pencil, Search, Image, Link2, Tag, Package, Globe } from "lucide-react";
import { PromoTextManager } from "@/components/admin/PromoTextManager";
import { ImageUpload } from "@/components/admin/ImageUpload";

type LinkType = "none" | "product" | "category" | "custom";

interface BannerForm {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  active: boolean;
  display_order: number;
}

const EMPTY_FORM: BannerForm = {
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  active: true,
  display_order: 0,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [linkType, setLinkType] = useState<LinkType>("none");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [products, productSearch]);

  const loadData = async () => {
    try {
      const [bannersData, productsData, categoriesData] = await Promise.all([
        getBanners(),
        getProducts(),
        getCategories(),
      ]);
      setBanners(bannersData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Detect link type from URL when editing
  const detectLinkType = (url: string): { type: LinkType; productId?: string; categorySlug?: string } => {
    if (!url) return { type: "none" };
    const productMatch = url.match(/\/producto\/([a-f0-9-]+)/);
    if (productMatch) return { type: "product", productId: productMatch[1] };
    const categoryMatch = url.match(/\/catalogo\?category=([^&]+)/);
    if (categoryMatch) return { type: "category", categorySlug: categoryMatch[1] };
    return { type: "custom" };
  };

  const updateLinkFromSelection = (type: LinkType, productId?: string, categorySlug?: string) => {
    let link = "";
    if (type === "product" && productId) {
      link = `/skating-store/producto/${productId}`;
      const product = products.find(p => p.id === productId);
      // Auto-fill image from product if empty
      if (product && !form.image_url && product.images?.[0]) {
        setForm(prev => ({ ...prev, image_url: product.images[0] }));
      }
    } else if (type === "category" && categorySlug) {
      link = `/skating-store/catalogo?category=${categorySlug}`;
    }
    setForm(prev => ({ ...prev, link_url: link }));
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    updateLinkFromSelection("product", productId);
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategorySlug(slug);
    updateLinkFromSelection("category", undefined, slug);
  };

  const handleLinkTypeChange = (type: LinkType) => {
    setLinkType(type);
    setSelectedProductId("");
    setSelectedCategorySlug("");
    setProductSearch("");
    if (type === "none") setForm(prev => ({ ...prev, link_url: "" }));
  };

  const openCreate = () => {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setLinkType("none");
    setSelectedProductId("");
    setSelectedCategorySlug("");
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      description: banner.description || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      active: banner.active,
      display_order: banner.display_order,
    });
    const detected = detectLinkType(banner.link_url || "");
    setLinkType(detected.type);
    setSelectedProductId(detected.productId || "");
    setSelectedCategorySlug(detected.categorySlug || "");
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) {
      toast.error("Título e Imagen son obligatorios");
      return;
    }
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, form);
        toast.success("Banner actualizado");
      } else {
        await createBanner(form);
        toast.success("Banner creado");
      }
      setIsDialogOpen(false);
      loadData();
    } catch {
      toast.error(editingBanner ? "Error al actualizar" : "Error al crear");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este banner?")) return;
    try {
      await deleteBanner(id);
      toast.success("Banner eliminado");
      loadData();
    } catch { toast.error("Error al eliminar"); }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateBanner(id, { active: !active });
      toast.success("Estado actualizado");
      loadData();
    } catch { toast.error("Error al actualizar"); }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Banners</h1>

      <Tabs defaultValue="carousel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="carousel">Carrusel Principal</TabsTrigger>
          <TabsTrigger value="promo">Banner de Envíos</TabsTrigger>
        </TabsList>

        <TabsContent value="carousel" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Banners del Carrusel</h2>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Banner
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBanner ? "Editar Banner" : "Crear Banner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Title */}
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Oferta de Verano"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ej: Descuentos de hasta 50%"
                  />
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Imagen del Banner</Label>
                  <ImageUpload
                    value={form.image_url ? [form.image_url] : []}
                    onChange={(urls) => setForm(prev => ({ ...prev, image_url: urls[0] || "" }))}
                    folder="banners"
                    single
                  />
                </div>

                {/* Link Type Selector */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Enlace del Banner</Label>
                  <Select value={linkType} onValueChange={(v) => handleLinkTypeChange(v as LinkType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿A dónde lleva este banner?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="flex items-center gap-2">Sin enlace</span>
                      </SelectItem>
                      <SelectItem value="product">
                        <span className="flex items-center gap-2"><Package className="h-4 w-4" /> A un Producto</span>
                      </SelectItem>
                      <SelectItem value="category">
                        <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> A una Categoría</span>
                      </SelectItem>
                      <SelectItem value="custom">
                        <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> URL Personalizada</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Product Selector */}
                  {linkType === "product" && (
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar producto..."
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors hover:bg-accent ${selectedProductId === product.id ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                          >
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.category} · RD${product.price.toLocaleString()}</p>
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No se encontraron productos</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Category Selector */}
                  {linkType === "category" && (
                    <Select value={selectedCategorySlug} onValueChange={handleCategorySelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Custom URL */}
                  {linkType === "custom" && (
                    <Input
                      value={form.link_url}
                      onChange={(e) => setForm(prev => ({ ...prev, link_url: e.target.value }))}
                      placeholder="/skating-store/catalogo o https://..."
                    />
                  )}

                  {form.link_url && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> {form.link_url}
                    </p>
                  )}
                </div>

                {/* Order & Active */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Orden</Label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <div className="flex items-center gap-3 h-10">
                      <Switch
                        checked={form.active}
                        onCheckedChange={(checked) => setForm(prev => ({ ...prev, active: checked }))}
                      />
                      <span className="text-sm">{form.active ? "Activo" : "Inactivo"}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingBanner ? "Actualizar Banner" : "Crear Banner"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
                      <img src={banner.image_url} alt={banner.title} className="h-10 w-20 object-cover rounded" />
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
                      <Switch checked={banner.active} onCheckedChange={() => handleToggleActive(banner.id, banner.active)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(banner)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="promo" className="mt-6">
          <PromoTextManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
