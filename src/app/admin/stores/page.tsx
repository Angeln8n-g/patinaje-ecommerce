"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { getStores, createStore, updateStore, deleteStore, assignSellerToStore, removeSellerFromStore, assignZoneToStore, removeZoneFromStore, getStoreById, updateStoreLocation, updateStoreShippingConfig } from "@/lib/skating-store/store-actions";
import { getSellers } from "@/lib/skating-store/user-actions";
import { getDeliveryZones } from "@/lib/skating-store/zone-actions";
import { Store, DeliveryZone, ShippingConfig } from "@/types/skating-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, MapPin, Users, Map, Eye, Store as StoreIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StoreMapPreview = dynamic(() => import("@/components/admin/StoreMapPreview"), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg border">Cargando mapa...</div>,
});

const StoreLocationPicker = dynamic(() => import("@/components/admin/StoreLocationPicker"), {
  ssr: false,
  loading: () => <div className="h-[250px] flex items-center justify-center bg-muted rounded-lg border text-sm text-muted-foreground">Cargando mapa...</div>,
});

interface SellerProfile {
  id: string; email: string; first_name?: string; last_name?: string; role: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [detailStore, setDetailStore] = useState<Store | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");

  // Store location editing
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Store shipping config
  const [shippingBaseRadius, setShippingBaseRadius] = useState("");
  const [shippingBaseRate, setShippingBaseRate] = useState("");
  const [shippingCostPerKm, setShippingCostPerKm] = useState("");
  const [shippingMaxDistance, setShippingMaxDistance] = useState("");
  const [shippingOutOfZone, setShippingOutOfZone] = useState(false);
  const [shippingAllowNoZones, setShippingAllowNoZones] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [storesData, sellersData, zonesData] = await Promise.all([
        getStores(), getSellers(), getDeliveryZones(),
      ]);
      setStores(storesData);
      setSellers(sellersData as SellerProfile[]);
      setZones(zonesData);
    } catch { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    try {
      await createStore({ name: formName.trim(), address: formAddress, color: formColor, lat: formLat ?? undefined, lng: formLng ?? undefined });
      toast.success("Tienda creada");
      setCreateOpen(false);
      setFormName(""); setFormAddress(""); setFormColor("#3b82f6"); setFormLat(null); setFormLng(null);
      await loadData();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tienda?")) return;
    try { await deleteStore(id); toast.success("Tienda eliminada"); await loadData(); }
    catch { toast.error("Error al eliminar"); }
  };

  const openDetail = async (store: Store) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await getStoreById(store.id);
      setDetailStore(full);
      // Load location into edit fields
      setEditLat(full?.lat ? Number(full.lat) : null);
      setEditLng(full?.lng ? Number(full.lng) : null);
      setEditAddress(full?.address || "");
      // Load shipping config
      const sc = full?.shipping_config;
      setShippingBaseRadius(sc?.base_radius_km != null ? String(sc.base_radius_km) : "");
      setShippingBaseRate(sc?.base_rate != null ? String(sc.base_rate) : "");
      setShippingCostPerKm(sc?.cost_per_extra_km != null ? String(sc.cost_per_extra_km) : "");
      setShippingMaxDistance(sc?.max_distance_km != null ? String(sc.max_distance_km) : "");
      setShippingOutOfZone(sc?.out_of_zone_enabled ?? false);
      setShippingAllowNoZones(sc?.allow_sales_without_zones ?? false);
    } catch { toast.error("Error al cargar detalle"); }
    finally { setDetailLoading(false); }
  };

  const handleAssignSeller = async () => {
    if (!detailStore || !selectedSellerId) return;
    try {
      await assignSellerToStore(detailStore.id, selectedSellerId);
      toast.success("Vendedor asignado");
      setSelectedSellerId("");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveSeller = async (sellerId: string) => {
    if (!detailStore) return;
    try {
      await removeSellerFromStore(detailStore.id, sellerId);
      toast.success("Vendedor removido");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
    } catch { toast.error("Error al remover vendedor"); }
  };

  const handleAssignZone = async () => {
    if (!detailStore || !selectedZoneId) return;
    try {
      await assignZoneToStore(detailStore.id, selectedZoneId);
      toast.success("Zona asignada");
      setSelectedZoneId("");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveZone = async (zoneId: string) => {
    if (!detailStore) return;
    try {
      await removeZoneFromStore(detailStore.id, zoneId);
      toast.success("Zona removida");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
    } catch { toast.error("Error al remover zona"); }
  };

  const handleSaveLocation = async () => {
    if (!detailStore || editLat == null || editLng == null) { toast.error("Selecciona una ubicación en el mapa"); return; }
    setSavingLocation(true);
    try {
      await updateStoreLocation(detailStore.id, editLat, editLng, editAddress);
      toast.success("Ubicación guardada");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
      await loadData();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingLocation(false); }
  };

  const handleSaveShippingConfig = async () => {
    if (!detailStore) return;
    const config: ShippingConfig = {
      base_radius_km: parseFloat(shippingBaseRadius) || 0,
      base_rate: parseFloat(shippingBaseRate) || 0,
      cost_per_extra_km: parseFloat(shippingCostPerKm) || 0,
      max_distance_km: parseFloat(shippingMaxDistance) || 0,
      out_of_zone_enabled: shippingOutOfZone,
      allow_sales_without_zones: shippingAllowNoZones,
    };
    if (config.max_distance_km <= config.base_radius_km) {
      toast.error("La distancia máxima debe ser mayor al radio base"); return;
    }
    setSavingShipping(true);
    try {
      await updateStoreShippingConfig(detailStore.id, config);
      toast.success("Configuración de envío guardada");
      const full = await getStoreById(detailStore.id);
      setDetailStore(full);
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingShipping(false); }
  };

  const sellerName = (s: { first_name?: string; last_name?: string; email: string }) =>
    s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : s.email;

  // Sellers not yet assigned to this store
  const availableSellers = detailStore
    ? sellers.filter((s) => !detailStore.sellers?.some((ds) => ds.id === s.id))
    : sellers;

  // Zones not yet assigned to this store
  const availableZones = detailStore
    ? zones.filter((z) => !detailStore.zones?.some((dz) => dz.id === z.id))
    : zones;

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Tiendas</h1>
          <p className="text-muted-foreground">Administra tiendas, asigna vendedores y zonas de entrega</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Tienda
        </Button>
      </div>

      {/* Store Map Preview */}
      {stores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map className="h-5 w-5" /> Mapa de Tiendas y Zonas</CardTitle>
          </CardHeader>
          <CardContent>
            <StoreMapPreview stores={stores} zones={zones} />
          </CardContent>
        </Card>
      )}

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay tiendas configuradas. Crea una para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: store.color }} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StoreIcon className="h-5 w-5" style={{ color: store.color }} />
                    {store.name}
                  </CardTitle>
                  <Badge variant={store.is_active ? "default" : "secondary"}>
                    {store.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {store.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {store.address}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openDetail(store)}>
                    <Eye className="h-4 w-4 mr-1" /> Gestionar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(store.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Store Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Tienda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre de la tienda" />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Dirección (opcional)" />
            </div>
            <div className="space-y-1">
              <Label>Ubicación en el mapa</Label>
              <p className="text-xs text-muted-foreground">Haz clic en el mapa para seleccionar la ubicación de la tienda</p>
              <StoreLocationPicker
                lat={formLat}
                lng={formLng}
                onSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }}
              />
              {formLat && formLng && (
                <p className="text-xs text-muted-foreground">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {formLat.toFixed(6)}, {formLng.toFixed(6)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Color identificador</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{formColor}</span>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Tienda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailStore && <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: detailStore.color }} />}
              {detailStore?.name || "Tienda"}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : detailStore && (
            <Tabs defaultValue="team" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="team">Equipo</TabsTrigger>
                <TabsTrigger value="location">Ubicación</TabsTrigger>
                <TabsTrigger value="zones">Zonas</TabsTrigger>
                <TabsTrigger value="shipping">Envío</TabsTrigger>
              </TabsList>

              {/* Tab: Equipo (Vendedores) */}
              <TabsContent value="team" className="space-y-4 mt-4">
                <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Vendedores Asignados</h3>
                {detailStore.sellers && detailStore.sellers.length > 0 ? (
                  <div className="space-y-2">
                    {detailStore.sellers.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <span className="text-sm">{sellerName(s)}</span>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveSeller(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin vendedores asignados</p>
                )}
                <div className="flex gap-2">
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar vendedor..." /></SelectTrigger>
                    <SelectContent>
                      {availableSellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{sellerName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignSeller} disabled={!selectedSellerId} size="sm">Asignar</Button>
                </div>
              </TabsContent>

              {/* Tab: Ubicación */}
              <TabsContent value="location" className="space-y-4 mt-4">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Ubicación de la Tienda</h3>
                <p className="text-xs text-muted-foreground">Haz clic en el mapa para seleccionar la ubicación</p>
                <StoreLocationPicker
                  lat={editLat}
                  lng={editLng}
                  onSelect={(lat, lng) => { setEditLat(lat); setEditLng(lng); }}
                />
                {editLat && editLng && (
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    {editLat.toFixed(6)}, {editLng.toFixed(6)}
                  </p>
                )}
                <div className="space-y-1">
                  <Label>Dirección</Label>
                  <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Dirección de la tienda" />
                </div>
                <Button onClick={handleSaveLocation} disabled={savingLocation || !editLat || !editLng} className="w-full">
                  {savingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar Ubicación
                </Button>
              </TabsContent>

              {/* Tab: Zonas de Entrega */}
              <TabsContent value="zones" className="space-y-4 mt-4">
                <h3 className="font-semibold flex items-center gap-2"><Map className="h-4 w-4" /> Zonas de Entrega</h3>
                {detailStore.zones && detailStore.zones.length > 0 ? (
                  <div className="space-y-2">
                    {detailStore.zones.map((z) => (
                      <div key={z.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: z.color || detailStore.color }} />
                          <span className="text-sm">{z.name}</span>
                          <Badge variant={z.is_active ? "default" : "secondary"} className="text-[10px]">
                            {z.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveZone(z.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin zonas asignadas. Crea zonas en "Zonas de Entrega" y asígnalas aquí.</p>
                )}
                <div className="flex gap-2">
                  <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar zona..." /></SelectTrigger>
                    <SelectContent>
                      {availableZones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignZone} disabled={!selectedZoneId} size="sm">Asignar</Button>
                </div>
              </TabsContent>

              {/* Tab: Configuración de Envío */}
              <TabsContent value="shipping" className="space-y-4 mt-4">
                <h3 className="font-semibold">Tarificación de Envío</h3>
                <p className="text-xs text-muted-foreground">Configura los parámetros de envío para esta tienda</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Radio Base (km)</Label>
                    <Input type="number" step="0.1" min="0" placeholder="Ej: 5" value={shippingBaseRadius} onChange={(e) => setShippingBaseRadius(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarifa Base ($)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="Ej: 50" value={shippingBaseRate} onChange={(e) => setShippingBaseRate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo por km extra ($)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="Ej: 10" value={shippingCostPerKm} onChange={(e) => setShippingCostPerKm(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Distancia Máxima (km)</Label>
                    <Input type="number" step="0.1" min="0" placeholder="Ej: 20" value={shippingMaxDistance} onChange={(e) => setShippingMaxDistance(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <Label className="text-sm">Envíos fuera de zona</Label>
                    <p className="text-xs text-muted-foreground">Permitir envíos entre radio base y distancia máxima</p>
                  </div>
                  <Switch checked={shippingOutOfZone} onCheckedChange={setShippingOutOfZone} />
                </div>
                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <Label className="text-sm">Ventas sin zonas</Label>
                    <p className="text-xs text-muted-foreground">Permitir ventas sin zonas de entrega activas</p>
                  </div>
                  <Switch checked={shippingAllowNoZones} onCheckedChange={setShippingAllowNoZones} />
                </div>
                <Button onClick={handleSaveShippingConfig} disabled={savingShipping} className="w-full">
                  {savingShipping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar Configuración de Envío
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
