'use client';

import { useRef, useCallback } from 'react';
import type { ContentProperties } from '@/lib/email-templates/types';
import { TEMPLATE_VARIABLES } from '@/lib/email-templates/variables';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BracesIcon } from 'lucide-react';

interface ContentTabProps {
  contentProperties: ContentProperties;
  onUpdateContent: (partial: Partial<ContentProperties>) => void;
}

interface FieldConfig {
  key: keyof ContentProperties;
  label: string;
  type: 'input' | 'textarea' | 'url';
  placeholder: string;
  supportsVariables: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: 'brandName', label: 'Nombre de marca', type: 'input', placeholder: 'Ej: Mi Tienda', supportsVariables: true },
  { key: 'heroLabel', label: 'Etiqueta hero', type: 'input', placeholder: 'Ej: NUEVA COLECCIÓN', supportsVariables: true },
  { key: 'title', label: 'Título', type: 'input', placeholder: 'Ej: Descubre lo nuevo', supportsVariables: true },
  { key: 'subtitle', label: 'Subtítulo', type: 'input', placeholder: 'Ej: Los mejores productos', supportsVariables: true },
  { key: 'ctaText', label: 'Texto CTA', type: 'input', placeholder: 'Ej: Ver Ahora', supportsVariables: true },
  { key: 'ctaUrl', label: 'URL CTA', type: 'url', placeholder: 'https://ejemplo.com', supportsVariables: false },
  { key: 'bodyText', label: 'Texto del cuerpo', type: 'textarea', placeholder: 'Contenido principal del email...', supportsVariables: true },
  { key: 'footerText', label: 'Texto del pie de página', type: 'textarea', placeholder: '© 2024 Mi Tienda', supportsVariables: true },
];

/** Regex to match {{variable}} patterns */
const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

/** Renders text with {{variables}} shown as badges inline */
function VariablePreview({ text }: { text: string }) {
  if (!text || !VARIABLE_REGEX.test(text)) return null;

  // Reset regex lastIndex
  const regex = /\{\{(\w+)\}\}/g;
  const parts: { type: 'text' | 'variable'; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'variable', value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  const variableLabel = (key: string) =>
    TEMPLATE_VARIABLES.find((v) => v.key === key)?.label ?? key;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {parts.map((part, i) =>
        part.type === 'variable' ? (
          <Badge key={i} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
            {variableLabel(part.value)}
          </Badge>
        ) : (
          <span key={i} className="truncate max-w-[120px]">
            {part.value.length > 20 ? '…' : part.value}
          </span>
        )
      )}
    </div>
  );
}

/** Button that opens a dropdown to insert a variable at cursor position */
function VariableInsertButton({
  inputRef,
  fieldKey,
  onUpdateContent,
  currentValue,
}: {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  fieldKey: keyof ContentProperties;
  onUpdateContent: (partial: Partial<ContentProperties>) => void;
  currentValue: string;
}) {
  const handleInsert = useCallback(
    (variableKey: string) => {
      const el = inputRef.current;
      const tag = `{{${variableKey}}}`;

      if (el) {
        const start = el.selectionStart ?? currentValue.length;
        const end = el.selectionEnd ?? currentValue.length;
        const newValue =
          currentValue.slice(0, start) + tag + currentValue.slice(end);
        onUpdateContent({ [fieldKey]: newValue });

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          el.focus();
          const cursorPos = start + tag.length;
          el.setSelectionRange(cursorPos, cursorPos);
        });
      } else {
        onUpdateContent({ [fieldKey]: currentValue + tag });
      }
    },
    [inputRef, fieldKey, onUpdateContent, currentValue]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          aria-label="Insertar variable"
        >
          <BracesIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {TEMPLATE_VARIABLES.map((v) => (
          <DropdownMenuItem key={v.key} onClick={() => handleInsert(v.key)}>
            <span className="font-mono text-xs text-primary">{`{{${v.key}}}`}</span>
            <span className="ml-auto text-xs text-muted-foreground">{v.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContentTab({ contentProperties, onUpdateContent }: ContentTabProps) {
  // Create refs for all fields that support variables
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const setFieldRef = useCallback(
    (key: string) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[key] = el;
    },
    []
  );

  const getFieldRef = useCallback(
    (key: string) => ({ current: fieldRefs.current[key] ?? null }) as React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    []
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold">Contenido</h3>

        {FIELDS.map((field) => {
          const value = contentProperties[field.key];

          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`content-${field.key}`}>{field.label}</Label>
                {field.supportsVariables && (
                  <VariableInsertButton
                    inputRef={getFieldRef(field.key)}
                    fieldKey={field.key}
                    onUpdateContent={onUpdateContent}
                    currentValue={value}
                  />
                )}
              </div>

              {field.type === 'textarea' ? (
                <Textarea
                  id={`content-${field.key}`}
                  ref={setFieldRef(field.key) as React.Ref<HTMLTextAreaElement>}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => onUpdateContent({ [field.key]: e.target.value })}
                  className="min-h-20 resize-y"
                />
              ) : (
                <Input
                  id={`content-${field.key}`}
                  ref={setFieldRef(field.key) as React.Ref<HTMLInputElement>}
                  type={field.type === 'url' ? 'url' : 'text'}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => onUpdateContent({ [field.key]: e.target.value })}
                />
              )}

              {field.supportsVariables && <VariablePreview text={value} />}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
