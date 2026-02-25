"use client";

import { useState, useEffect, useCallback } from "react";
import { getProductByBarcode, updateProductStock } from "@/lib/skating-store/supabase-queries";
import { getMyStore, getMyStoreProducts, getMyStoreInventoryMovements } from "@/lib/skating-store/seller-actions";
import { Product } from "@/types/skating-store";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Search, Barcode as BarcodeIcon, Package, Store as StoreIcon, AlertCircle, History } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SellerInventoryPage() {
  const [storeId, setStoreId] = useState<string>("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [barcode, setBarcode] = useState("");
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState(1);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const store = await getMyStore();
      if (store?.id) {
        setStoreId(store.id);
        setStoreName(store.name);
        const prods = await getMyStoreProducts();
        setStoreProducts(prods);
      }
      setLoading(false);
    }
    load();
  }, []);

  const loadMovements = async () => {
    setMovementsLoading(true);
    const movs = await getMyStoreInventoryMovements();
    setMovements(movs);
    setMovementsLoading(false);
  };

  const handleSearch = useCallback(async (codeToSearch: string) => {
    if (!codeToSearch) return;
    setSearching(true);
    setProduct(null);
    try {
      const found = await getProductByBarcode(codeToSearch);
      if (found) {
        setProduct(found);
        toast.success("Producto encontrado");
      } else {
        toast.error("Producto no encontrado con ese código");
      }
    } catch { toast.error("Error al buscar"); }
    finally { setSearching(false); }
  }, []);

  const handleScan = (decodedText: string) => { setBarcode(decodedText); handleSearch(decodedText); };

  const handleAddStock = async () => {
    if (!product || !storeId) return;
    setSearching(true);
    try {
      await updateProductStock(product.id, stockToAdd, 'in', 'Entrada de inventario por vendedor', undefined, storeId);
      toast.success(`+${stockToAdd} unidades agregadas al inventario del local`);
      setStockToAdd(1);
      setProduct(null);
      setBarcode("");
      // Refresh store products
      const prods = await getMyStoreProducts();
      setStoreProducts(prods);
    } catch { toast.error("Error al actualizar stock"); }
    finally { setSearching(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!storeId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Inventario del Local</h1>
        <div className="flex gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Sin tienda asignada</h4>
            <p className="text-sm text-amber-700">No tienes una tienda asignada. Contacta al administrador.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario del Local</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <StoreIcon className="h-4 w-4" /> {storeName}
        </p>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="entry">Entrada de Stock</TabsTrigger>
          <TabsTrigger value="movements" onClick={loadMovements}>Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          {storeProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No hay productos con stock en tu local.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Stock Local</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeProducts.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="capitalize">{p.category}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.barcode || "—"}</TableCell>
                      <TableCell className="text-right font-bold">{p.stock}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="entry" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Escanear Producto</CardTitle>
                <CardDescription>Busca un producto por código para agregar stock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Código..." className="pl-9" value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(barcode)} />
                  </div>
                  <Button size="icon" onClick={() => handleSearch(barcode)} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <BarcodeScanner onScan={handleScan} />
              </CardContent>
            </Card>

            {product && (
              <Card className="border-primary">
                <CardHeader className="bg-primary/5">
                  <Badge variant="outline" className="w-fit mb-1">Producto Encontrado</Badge>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>Código: {product.barcode} | Precio: {formatCurrency(product.price)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Stock Global</p>
                    <p className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5" />{product.stock}</p>
                  </div>
                  <div>
                    <Label>Cantidad a agregar</Label>
                    <Input type="number" min={1} value={stockToAdd} onChange={(e) => setStockToAdd(parseInt(e.target.value) || 1)} className="mt-1" />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setProduct(null); setBarcode(""); }}>Cancelar</Button>
                  <Button onClick={handleAddStock} disabled={searching}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar al Local
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          {movementsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No hay movimientos registrados.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Razón</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 50).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{m.product_name}</TableCell>
                      <TableCell>
                        <Badge variant={m.movement_type === 'in' ? 'default' : m.movement_type === 'out' ? 'destructive' : 'secondary'}>
                          {m.movement_type === 'in' ? 'Entrada' : m.movement_type === 'out' ? 'Salida' : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.quantity_change > 0 ? '+' : ''}{m.quantity_change}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
