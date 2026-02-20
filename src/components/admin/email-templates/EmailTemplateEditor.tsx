'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEmailTemplateEditor } from '@/hooks/useEmailTemplateEditor';
import { TemplateListPanel } from './TemplateListPanel';
import { TemplateCanvas } from './TemplateCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Undo2, Redo2, Save, Download, Send } from 'lucide-react';
import { toast } from 'sonner';

export function EmailTemplateEditor() {
  const editor = useEmailTemplateEditor();
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!editor.isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editor.isDirty]);

  const handleSave = useCallback(async () => {
    try {
      await editor.saveTemplate();
      toast.success('Plantilla guardada correctamente');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al guardar la plantilla'
      );
    }
  }, [editor]);

  const handleSendTestEmail = useCallback(async () => {
    if (!testEmail.trim()) return;
    setIsSending(true);
    try {
      await editor.sendTestEmail(testEmail.trim());
      toast.success(`Email de prueba enviado a ${testEmail.trim()}`);
      setTestEmailOpen(false);
      setTestEmail('');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Error al enviar el email de prueba'
      );
    } finally {
      setIsSending(false);
    }
  }, [editor, testEmail]);

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Editor de Plantillas</h1>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={editor.undo}
            disabled={!editor.canUndo}
            aria-label="Deshacer"
          >
            <Undo2 className="size-4" />
            Deshacer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={editor.redo}
            disabled={!editor.canRedo}
            aria-label="Rehacer"
          >
            <Redo2 className="size-4" />
            Rehacer
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!editor.activeTemplate || editor.isLoading}
            aria-label="Guardar"
          >
            <Save className="size-4" />
            Guardar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={editor.exportHtml}
            disabled={!editor.htmlContent}
            aria-label="Exportar HTML"
          >
            <Download className="size-4" />
            Exportar HTML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestEmailOpen(true)}
            disabled={!editor.activeTemplate}
            aria-label="Enviar email de prueba"
          >
            <Send className="size-4" />
            Enviar prueba
          </Button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="grid flex-1 grid-cols-[250px_1fr_320px] overflow-hidden">
        {/* Left panel: Template list */}
        <TemplateListPanel
          templates={editor.templates}
          activeTemplateId={editor.activeTemplate?.id ?? null}
          isLoading={editor.isLoading}
          onCreateTemplate={editor.createTemplate}
          onSelectTemplate={editor.selectTemplate}
          onDeleteTemplate={editor.deleteTemplate}
        />

        {/* Center panel: Canvas */}
        <TemplateCanvas
          htmlContent={editor.htmlContent}
          viewMode={editor.viewMode}
          previewMode={editor.previewMode}
          selectedSection={editor.selectedSection}
          onSetViewMode={editor.setViewMode}
          onSetPreviewMode={editor.setPreviewMode}
          onSelectSection={editor.selectSection}
          onUpdateHtml={editor.updateHtml}
        />

        {/* Right panel: Properties */}
        <div className="border-l">
          <PropertiesPanel
            contentProperties={editor.contentProperties}
            onUpdateContent={editor.updateContent}
            styleProperties={editor.styleProperties}
            onUpdateStyle={editor.updateStyle}
            config={editor.config}
            htmlContent={editor.htmlContent}
            onUpdateConfig={editor.updateConfig}
          />
        </div>
      </div>

      {/* Test email modal */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar email de prueba</DialogTitle>
            <DialogDescription>
              Ingresa la dirección de email donde deseas recibir la prueba.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && testEmail.trim()) {
                  handleSendTestEmail();
                }
              }}
              aria-label="Dirección de email de prueba"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestEmailOpen(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={!testEmail.trim() || isSending}
            >
              <Send className="size-4" />
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
