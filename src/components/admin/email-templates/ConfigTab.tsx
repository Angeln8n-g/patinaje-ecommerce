'use client';

import { useState } from 'react';
import type { TemplateConfig, TriggerType, TemplateStatus } from '@/lib/email-templates/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConfigTabProps {
  config: TemplateConfig;
  htmlContent: string;
  onUpdateConfig: (partial: Partial<TemplateConfig>) => void;
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'automatico-registro', label: 'Automático — Registro' },
  { value: 'manual-campana', label: 'Manual — Campaña' },
  { value: 'evento-disparado', label: 'Evento disparado' },
];

const STATUS_OPTIONS: { value: TemplateStatus; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'pausada', label: 'Pausada' },
];

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  name: 'Nombre de plantilla',
  subject: 'Asunto',
  senderName: 'Nombre del remitente',
  replyTo: 'Email de respuesta',
  htmlContent: 'Contenido HTML',
};

function getValidationErrors(config: TemplateConfig, htmlContent: string): string[] {
  const missing: string[] = [];
  if (!config.name.trim()) missing.push('name');
  if (!config.subject.trim()) missing.push('subject');
  if (!config.senderName.trim()) missing.push('senderName');
  if (!config.replyTo.trim()) missing.push('replyTo');
  if (!htmlContent.trim()) missing.push('htmlContent');
  return missing;
}

export function ConfigTab({ config, htmlContent, onUpdateConfig }: ConfigTabProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleStatusChange = (value: TemplateStatus) => {
    if (value === 'activa') {
      const nextConfig = { ...config, status: value };
      const missing = getValidationErrors(nextConfig, htmlContent);
      if (missing.length > 0) {
        setValidationErrors(missing);
        return;
      }
    }
    setValidationErrors([]);
    onUpdateConfig({ status: value });
  };

  const handleFieldChange = (field: keyof TemplateConfig, value: string) => {
    // Clear validation error for this field when user types
    if (validationErrors.includes(field)) {
      setValidationErrors(prev => prev.filter(f => f !== field));
    }
    onUpdateConfig({ [field]: value });
  };

  const hasError = (field: string) => validationErrors.includes(field);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold">Configuración</h3>

        {/* Template name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-name">Nombre de plantilla</Label>
          <Input
            id="config-name"
            value={config.name}
            placeholder="Ej: Bienvenida nuevos usuarios"
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={hasError('name') ? 'border-destructive' : ''}
          />
          {hasError('name') && (
            <p className="text-xs text-destructive">Este campo es obligatorio</p>
          )}
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-subject">Asunto</Label>
          <Input
            id="config-subject"
            value={config.subject}
            placeholder="Ej: ¡Bienvenido a nuestra tienda!"
            onChange={(e) => handleFieldChange('subject', e.target.value)}
            className={hasError('subject') ? 'border-destructive' : ''}
          />
          {hasError('subject') && (
            <p className="text-xs text-destructive">Este campo es obligatorio</p>
          )}
        </div>

        {/* Sender name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-senderName">Nombre del remitente</Label>
          <Input
            id="config-senderName"
            value={config.senderName}
            placeholder="Ej: Mi Tienda"
            onChange={(e) => handleFieldChange('senderName', e.target.value)}
            className={hasError('senderName') ? 'border-destructive' : ''}
          />
          {hasError('senderName') && (
            <p className="text-xs text-destructive">Este campo es obligatorio</p>
          )}
        </div>

        {/* Reply-to email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="config-replyTo">Email de respuesta</Label>
          <Input
            id="config-replyTo"
            type="email"
            value={config.replyTo}
            placeholder="Ej: soporte@mitienda.com"
            onChange={(e) => handleFieldChange('replyTo', e.target.value)}
            className={hasError('replyTo') ? 'border-destructive' : ''}
          />
          {hasError('replyTo') && (
            <p className="text-xs text-destructive">Este campo es obligatorio</p>
          )}
        </div>

        {/* Trigger type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="config-triggerType">Tipo de trigger</Label>
          <Select
            value={config.triggerType}
            onValueChange={(value) => onUpdateConfig({ triggerType: value as TriggerType })}
          >
            <SelectTrigger id="config-triggerType" className="w-full">
              <SelectValue placeholder="Seleccionar trigger" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="config-status">Estado</Label>
          <Select
            value={config.status}
            onValueChange={(value) => handleStatusChange(value as TemplateStatus)}
          >
            <SelectTrigger id="config-status" className="w-full">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Validation error summary */}
        {validationErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-xs font-medium text-destructive mb-1">
              No se puede activar la plantilla. Campos faltantes:
            </p>
            <ul className="text-xs text-destructive list-disc list-inside">
              {validationErrors.map((field) => (
                <li key={field}>{REQUIRED_FIELD_LABELS[field] ?? field}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
