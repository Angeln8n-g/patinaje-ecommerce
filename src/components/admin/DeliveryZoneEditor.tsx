"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  toggleDeliveryZone,
} from "@/lib/skating-store/zone-actions";
import { DeliveryZone } from "@/types/skating-store";

// Default center: Mexico City
const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 13;

// Colors for zones
const ACTIVE_ZONE_COLOR = "#3b82f6"; // blue-500
const INACTIVE_ZONE_COLOR = "#9ca3af"; // gray-400
const DRAWING_COLOR = "#ef4444"; // red-500
const VERTEX_COLOR = "#1d4ed8"; // blue-700

type EditorMode = "idle" | "creating" | "editing";

/**
 * Inner component that captures map click events during zone creation/editing.
 */
function MapClickHandler({
  onClick,
  active,
}: {
  onClick: (lat: number, lng: number) => void;
  active: boolean;
}) {
  useMapEvents({
    click(e) {
      if (active) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function DeliveryZoneEditor() {
  // Zone data
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor mode
  const [mode, setMode] = useState<EditorMode>("idle");
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Drawing state — vertices being placed
  const [drawingVertices, setDrawingVertices] = useState<
    Array<{ lat: number; lng: number }>
  >([]);

  // Form state
  const [zoneName, setZoneName] = useState("");

  // UI feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Load zones on mount ──────────────────────────────────────────────────
  const loadZones = useCallback(async () => {
    try {
      const data = await getDeliveryZones();
      setZones(data);
    } catch (err) {
      console.error("Error loading delivery zones:", err);
      setError("Error al cargar las zonas de entrega");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // ─── Map click handler ────────────────────────────────────────────────────
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode === "creating" || mode === "editing") {
        setDrawingVertices((prev) => [
          ...prev,
          { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) },
        ]);
      }
    },
    [mode]
  );

  // ─── Start creating a new zone ────────────────────────────────────────────
  const startCreating = () => {
    setMode("creating");
    setDrawingVertices([]);
    setZoneName("");
    setEditingZoneId(null);
    setError(null);
    setSuccess(null);
  };

  // ─── Start editing an existing zone ───────────────────────────────────────
  const startEditing = (zone: DeliveryZone) => {
    setMode("editing");
    setEditingZoneId(zone.id);
    setDrawingVertices([...zone.polygon]);
    setZoneName(zone.name);
    setError(null);
    setSuccess(null);
  };

  // ─── Cancel current operation ─────────────────────────────────────────────
  const cancelOperation = () => {
    setMode("idle");
    setDrawingVertices([]);
    setZoneName("");
    setEditingZoneId(null);
    setError(null);
  };

  // ─── Remove last vertex ───────────────────────────────────────────────────
  const removeLastVertex = () => {
    setDrawingVertices((prev) => prev.slice(0, -1));
  };

  // ─── Save zone (create or update) ────────────────────────────────────────
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!zoneName.trim()) {
      setError("El nombre de la zona es requerido");
      return;
    }

    if (drawingVertices.length < 3) {
      setError("El polígono debe tener al menos 3 vértices");
      return;
    }

    setSaving(true);
    try {
      if (mode === "creating") {
        const result = await createDeliveryZone(
          zoneName.trim(),
          drawingVertices
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSuccess(`Zona "${zoneName.trim()}" creada correctamente`);
      } else if (mode === "editing" && editingZoneId) {
        const result = await updateDeliveryZone(editingZoneId, {
          name: zoneName.trim(),
          polygon: drawingVertices,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSuccess(`Zona "${zoneName.trim()}" actualizada correctamente`);
      }

      // Reset and reload
      setMode("idle");
      setDrawingVertices([]);
      setZoneName("");
      setEditingZoneId(null);
      await loadZones();
    } catch (err) {
      console.error("Error saving zone:", err);
      setError("Error al guardar la zona. Intente de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle zone active/inactive ──────────────────────────────────────────
  const handleToggle = async (zone: DeliveryZone) => {
    setError(null);
    setSuccess(null);
    try {
      await toggleDeliveryZone(zone.id, !zone.is_active);
      setSuccess(
        `Zona "${zone.name}" ${zone.is_active ? "desactivada" : "activada"} correctamente`
      );
      await loadZones();
    } catch (err) {
      console.error("Error toggling zone:", err);
      setError("Error al cambiar el estado de la zona");
    }
  };

  // ─── Delete zone ──────────────────────────────────────────────────────────
  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`¿Estás seguro de eliminar la zona "${zone.name}"?`)) return;

    setError(null);
    setSuccess(null);
    try {
      await deleteDeliveryZone(zone.id);
      setSuccess(`Zona "${zone.name}" eliminada correctamente`);
      await loadZones();
    } catch (err) {
      console.error("Error deleting zone:", err);
      setError("Error al eliminar la zona");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zonas de Entrega</CardTitle>
          <CardDescription>Cargando zonas…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isDrawing = mode === "creating" || mode === "editing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zonas de Entrega</CardTitle>
        <CardDescription>
          Define las áreas geográficas donde la tienda realiza envíos. Haz clic
          en el mapa para agregar vértices al polígono.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Alerts ─────────────────────────────────────────────── */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === "idle" && (
            <Button onClick={startCreating}>+ Nueva Zona</Button>
          )}
          {isDrawing && (
            <>
              <Badge variant={mode === "creating" ? "default" : "secondary"}>
                {mode === "creating"
                  ? "Creando zona"
                  : `Editando: ${zoneName}`}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {drawingVertices.length} vértice
                {drawingVertices.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={removeLastVertex}
                disabled={drawingVertices.length === 0}
              >
                Deshacer vértice
              </Button>
              <Button variant="outline" size="sm" onClick={cancelOperation}>
                Cancelar
              </Button>
            </>
          )}
        </div>

        {/* ── Drawing form (name + save) ─────────────────────────── */}
        {isDrawing && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="zone-name">Nombre de la zona</Label>
              <Input
                id="zone-name"
                type="text"
                placeholder="Ej: Centro Histórico"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || drawingVertices.length < 3 || !zoneName.trim()}
            >
              {saving
                ? "Guardando…"
                : mode === "creating"
                  ? "Guardar zona"
                  : "Actualizar zona"}
            </Button>
          </div>
        )}

        {/* ── Instruction hint ───────────────────────────────────── */}
        {isDrawing && (
          <p className="text-sm text-muted-foreground">
            Haz clic en el mapa para agregar vértices.{" "}
            {drawingVertices.length < 3
              ? `Necesitas al menos ${3 - drawingVertices.length} vértice${3 - drawingVertices.length !== 1 ? "s" : ""} más.`
              : "Ya puedes guardar la zona."}
          </p>
        )}

        {/* ── Map ────────────────────────────────────────────────── */}
        <div className="h-[500px] w-full rounded-lg overflow-hidden border">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onClick={handleMapClick} active={isDrawing} />

            {/* Existing zones as colored polygons */}
            {zones
              .filter((z) => z.id !== editingZoneId)
              .map((zone) => (
                <Polygon
                  key={zone.id}
                  positions={zone.polygon.map((v) => [v.lat, v.lng] as [number, number])}
                  pathOptions={{
                    color: zone.is_active
                      ? ACTIVE_ZONE_COLOR
                      : INACTIVE_ZONE_COLOR,
                    fillColor: zone.is_active
                      ? ACTIVE_ZONE_COLOR
                      : INACTIVE_ZONE_COLOR,
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="font-semibold">{zone.name}</p>
                      <p className="text-xs">
                        {zone.is_active ? "Activa" : "Inactiva"} •{" "}
                        {zone.polygon.length} vértices
                      </p>
                    </div>
                  </Popup>
                </Polygon>
              ))}

            {/* Drawing preview: polyline connecting vertices */}
            {drawingVertices.length >= 2 && (
              <Polyline
                positions={drawingVertices.map(
                  (v) => [v.lat, v.lng] as [number, number]
                )}
                pathOptions={{
                  color: DRAWING_COLOR,
                  weight: 2,
                  dashArray: "6 4",
                }}
              />
            )}

            {/* Drawing preview: close the polygon if 3+ vertices */}
            {drawingVertices.length >= 3 && (
              <Polygon
                positions={drawingVertices.map(
                  (v) => [v.lat, v.lng] as [number, number]
                )}
                pathOptions={{
                  color: DRAWING_COLOR,
                  fillColor: DRAWING_COLOR,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 4",
                }}
              />
            )}

            {/* Drawing preview: vertex markers */}
            {drawingVertices.map((v, i) => (
              <CircleMarker
                key={`vertex-${i}`}
                center={[v.lat, v.lng]}
                radius={5}
                pathOptions={{
                  color: VERTEX_COLOR,
                  fillColor: "#fff",
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup>
                  <span className="text-xs">
                    Vértice {i + 1}: {v.lat.toFixed(6)}, {v.lng.toFixed(6)}
                  </span>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* ── Zone list ──────────────────────────────────────────── */}
        {zones.length === 0 && mode === "idle" && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay zonas de entrega configuradas. Haz clic en &quot;+ Nueva
            Zona&quot; para crear una.
          </p>
        )}

        {zones.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Zonas configuradas ({zones.length})
            </h3>
            <div className="divide-y rounded-md border">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: zone.is_active
                          ? ACTIVE_ZONE_COLOR
                          : INACTIVE_ZONE_COLOR,
                      }}
                    />
                    <span className="font-medium truncate">{zone.name}</span>
                    <Badge
                      variant={zone.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {zone.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {zone.polygon.length} vértices
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(zone)}
                      disabled={isDrawing}
                    >
                      {zone.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(zone)}
                      disabled={isDrawing}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(zone)}
                      disabled={isDrawing}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
