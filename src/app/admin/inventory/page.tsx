"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductByBarcode, updateProductStock, quickCreateProduct, getCategories } from "@/lib/skating-store/supabase-queries";
import { Product, Category } from "@/types/skating-store";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Search, Barcode as BarcodeIcon, Package, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stockToAdd, setStockToAdd] = useState(1);
  const [priceToUpdate, setPriceToUpdate] = useState<string>("");
  
  // Quick Create Form State
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [newUnitType, setNewUnitType] = useState("unit");
  const [newSupplier, setNewSupplier] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategories();
      setCategories(cats);
    }
    loadCategories();
  }, []);

  const handleSearch = useCallback(async (codeToSearch: string) => {
    if (!codeToSearch) return;
    
    setLoading(true);
    setProduct(null);
    setShowCreateForm(false);
    
    try {
      const foundProduct = await getProductByBarcode(codeToSearch);
      if (foundProduct) {
        setProduct(foundProduct);
        setPriceToUpdate(foundProduct.price.toString());
        toast.success("Producto encontrado");
      } else {
        setShowCreateForm(true);
        setNewName("");
        setNewPrice("");
        setNewStock("1");
        toast.info("Por favor, ingresa el nombre y el precio de venta para este nuevo producto.");
      }
    } catch (error) {
      toast.error("Error al buscar el producto");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = (decodedText: string) => {
    setBarcode(decodedText);
    handleSearch(decodedText);
  };

  const handleUpdateStock = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      const { newStock, newPrice } = await updateProductStock(
        product.id, 
        stockToAdd, 
        'in', 
        'Entrada de inventario por escaneo',
        parseFloat(priceToUpdate)
      );
      
      setProduct({ ...product, stock: newStock, price: newPrice });
      toast.success(`Inventario actualizado. Stock: ${newStock}, Precio: $${newPrice}`);
      setStockToAdd(1);
      
      // Clear for next scan after short delay
      setTimeout(() => {
        setProduct(null);
        setBarcode("");
      }, 2000);
    } catch (error) {
      toast.error("Error al actualizar stock");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      toast.error("Selecciona una categoría primero");
      return;
    }

    setLoading(true);
    try {
      const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        name: newName,
        barcode: barcode,
        price: parseFloat(newPrice),
        stock: parseInt(newStock),
        category: selectedCategory,
        unit_type: newUnitType,
        supplier: newSupplier,
        status: 'active',
        featured: false,
        description: "",
        images: [],
        variant_type: "none",
        variant_options: [],
        variant_prices: {},
        variant_images: {},
      };

      const created = await quickCreateProduct(productData);
      toast.success("Producto creado exitosamente");
      setProduct(created);
      setShowCreateForm(false);
      
      // Clear for next scan after short delay
      setTimeout(() => {
        setProduct(null);
        setBarcode("");
      }, 2000);
    } catch (error) {
      toast.error("Error al crear el producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
        <p className="text-muted-foreground">
          Agrega stock o crea nuevos productos rápidamente escaneando códigos de barras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Category & Scan */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoría por defecto</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se usará para nuevos productos.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Label className="mb-2 block">Buscar / Escanear</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código..."
                      className="pl-9"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(barcode)}
                    />
                  </div>
                  <Button size="icon" onClick={() => handleSearch(barcode)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escáner de Cámara</CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner onScan={handleScan} />
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Results */}
        <div className="md:col-span-2">
          {!product && !showCreateForm && !loading && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarcodeIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Esperando escaneo</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Escanea un producto o ingresa el código manualmente para comenzar.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {product && (
            <Card className="border-primary shadow-lg animate-in fade-in zoom-in duration-300">
              <CardHeader className="bg-primary/5">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2">Producto Existente</Badge>
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <CardDescription>Código: {product.barcode}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Precio Actual</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-muted/30 p-4 rounded-lg flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground mb-1">Stock Actual</p>
                    <p className="text-3xl font-bold flex items-center gap-2">
                      <Package className="h-6 w-6 text-muted-foreground" />
                      {product.stock}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <p className="text-sm text-primary font-medium mb-2">Precio de Venta</p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={priceToUpdate} 
                          onChange={(e) => setPriceToUpdate(e.target.value)}
                          className="text-lg font-bold h-12 pl-7 border-primary/30"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        Puedes actualizar el precio si ha cambiado.
                      </p>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <p className="text-sm text-primary font-medium mb-2">Suministrar Stock</p>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number" 
                          value={stockToAdd} 
                          onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
                          className="text-lg font-bold h-12 border-primary/30"
                        />
                        <span className="text-sm font-medium">unid.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => {setProduct(null); setBarcode("");}}>
                  Cancelar
                </Button>
                <Button size="lg" className="gap-2" onClick={handleUpdateStock} disabled={loading}>
                  <Plus className="h-5 w-5" />
                  Actualizar Inventario
                </Button>
              </CardFooter>
            </Card>
          )}

          {showCreateForm && (
            <Card className="border-blue-500 shadow-lg animate-in slide-in-from-right duration-300">
              <form onSubmit={handleQuickCreate}>
                <CardHeader className="bg-blue-50">
                  <Badge className="mb-2 bg-blue-600 hover:bg-blue-700">Nuevo Producto</Badge>
                  <CardTitle>Creación Rápida</CardTitle>
                  <CardDescription>Código escaneado: {barcode}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Nombre del Producto *</Label>
                      <Input 
                        id="name" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        required 
                        placeholder="Ej: Patines Rollerblade RB 80"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price">Precio de Venta *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input 
                          id="price" 
                          type="number" 
                          step="0.01" 
                          className="pl-7"
                          value={newPrice} 
                          onChange={(e) => setNewPrice(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock">Cantidad Inicial *</Label>
                      <Input 
                        id="stock" 
                        type="number" 
                        value={newStock} 
                        onChange={(e) => setNewStock(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidad de Medida</Label>
                      <Select value={newUnitType} onValueChange={setNewUnitType}>
                        <SelectTrigger id="unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unit">Unidad</SelectItem>
                          <SelectItem value="box">Caja</SelectItem>
                          <SelectItem value="pair">Par</SelectItem>
                          <SelectItem value="meter">Metro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplier">Proveedor (Opcional)</Label>
                      <Input 
                        id="supplier" 
                        value={newSupplier} 
                        onChange={(e) => setNewSupplier(e.target.value)} 
                        placeholder="Nombre del proveedor"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2" disabled={loading || !selectedCategory}>
                    <CheckCircle2 className="h-5 w-5" />
                    Crear y Guardar
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t">
        <div className="flex gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-900">Uso con Lector USB</h4>
            <p className="text-sm text-green-700">
              Conecta tu lector físico. Haz clic en el campo de "Código" y escanea. El sistema detectará automáticamente el código al presionar Enter.
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Configuración Rápida</h4>
            <p className="text-sm text-blue-700">
              Asegúrate de seleccionar la categoría por defecto antes de escanear productos nuevos para ahorrar tiempo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
