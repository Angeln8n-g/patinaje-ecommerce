"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCancellations,
  cancelAdminOrder,
  type CancellationRecord,
} from "@/lib/skating-store/order-cancellation-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CancelOrderModal } from "@/components/shared/CancelOrderModal";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Ban } from "lucide-react";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  USER: "Usuario",
  DELIVERY: "Repartidor",
  SELLER: "Vendedor",
  ADMIN: "Administrador",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  USER: "outline",
  DELIVERY: "secondary",
  SELLER: "default",
  ADMIN: "destructive",
};

export default function AdminCancellationsPage() {
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // New order cancel input
  const [newOrderId, setNewOrderId] = useState("");

  const loadCancellations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCancellations({
        role: roleFilter !== "all" ? roleFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setCancellations(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Error al cargar cancelaciones");
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, dateFrom, dateTo, offset]);

  useEffect(() => {
    loadCancellations();
  }, [loadCancellations]);

  const handleFilterChange = () => {
    setOffset(0);
  };

  const handleConfirmCancel = async (
    reasonCode: string,
    reasonDescription?: string
  ) => {
    setCancelLoading(true);
    try {
      await cancelAdminOrder(cancelOrderId, { reasonCode, reasonDescription });
      toast.success("Pedido cancelado correctamente");
      setCancelModalOpen(false);
      setCancelOrderId("");
      setNewOrderId("");
      await loadCancellations();
    } catch (err: any) {
      toast.error(err.message || "Error al cancelar pedido");
    } finally {
      setCancelLoading(false);
    }
  };

  const openCancelModal = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelModalOpen(true);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cancelaciones</h1>

      {/* Cancel any order */}
      <Card>
        <CardHeader>
          <CardTitle>Cancelar un pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="grid gap-2 flex-1 max-w-sm">
              <Label htmlFor="order-id-input">ID del pedido</Label>
              <Input
                id="order-id-input"
                placeholder="Ingrese el ID del pedido..."
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              disabled={!newOrderId.trim()}
              onClick={() => openCancelModal(newOrderId.trim())}
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancelar pedido
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de cancelaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label>Rol del solicitante</Label>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="DELIVERY">Repartidor</SelectItem>
                  <SelectItem value="SELLER">Vendedor</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date-from">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date-to">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
            {(roleFilter !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRoleFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  handleFilterChange();
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : cancellations.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              No se encontraron cancelaciones.
            </p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancellations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">
                          {c.order_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {new Date(c.created_at).toLocaleDateString("es-DO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANTS[c.cancelled_by_role] || "outline"}>
                            {ROLE_LABELS[c.cancelled_by_role] || c.cancelled_by_role}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.cancelled_by_name}</TableCell>
                        <TableCell className="max-w-[250px]">
                          <span className="text-sm">
                            {c.reason_code}
                            {c.reason_description && (
                              <span className="text-muted-foreground block text-xs truncate">
                                {c.reason_description}
                              </span>
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {total} cancelación{total !== 1 ? "es" : ""} en total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        role="ADMIN"
        onConfirm={handleConfirmCancel}
        loading={cancelLoading}
      />
    </div>
  );
}
