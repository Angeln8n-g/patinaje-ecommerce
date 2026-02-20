'use client';

import { useState } from 'react';
import type { EmailTemplateListItem, TemplateStatus } from '@/lib/email-templates/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateListPanelProps {
  templates: EmailTemplateListItem[];
  activeTemplateId: string | null;
  isLoading: boolean;
  onCreateTemplate: () => void;
  onSelectTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

const statusConfig: Record<TemplateStatus, { label: string; className: string }> = {
  activa: {
    label: 'Activa',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  borrador: {
    label: 'Borrador',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  pausada: {
    label: 'Pausada',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function TemplateListPanel({
  templates,
  activeTemplateId,
  isLoading,
  onCreateTemplate,
  onSelectTemplate,
  onDeleteTemplate,
}: TemplateListPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateListItem | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDeleteTemplate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">Plantillas</h2>
        <Button size="sm" onClick={onCreateTemplate} disabled={isLoading}>
          <Plus className="size-4" />
          Crear plantilla
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {templates.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay plantillas. Crea una para comenzar.
          </div>
        ) : (
          <div className="flex flex-col">
            {templates.map((template) => {
              const status = statusConfig[template.status];
              const isActive = template.id === activeTemplateId;

              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'group flex cursor-pointer items-start justify-between gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50',
                    isActive && 'bg-accent'
                  )}
                  onClick={() => onSelectTemplate(template.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTemplate(template.id);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{template.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={cn('text-[10px]', status.className)}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(template);
                    }}
                    aria-label={`Eliminar plantilla ${template.name}`}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla &quot;{deleteTarget?.name}&quot;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget?.status === 'activa' && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                Esta plantilla está activa y actualmente en uso. Eliminarla puede afectar
                el envío de correos electrónicos.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
