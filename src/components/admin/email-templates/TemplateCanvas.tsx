'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, Code, Monitor, Smartphone, Save } from 'lucide-react';

interface TemplateCanvasProps {
  htmlContent: string;
  viewMode: 'preview' | 'code';
  previewMode: 'desktop' | 'mobile';
  selectedSection: string | null;
  onSetViewMode: (mode: 'preview' | 'code') => void;
  onSetPreviewMode: (mode: 'desktop' | 'mobile') => void;
  onSelectSection: (sectionId: string | null) => void;
  onUpdateHtml: (html: string) => void;
}

/**
 * Generates a highlight script that injects into the iframe to visually
 * highlight the selected section and detect clicks on data-section elements.
 */
function buildIframeScript(selectedSection: string | null): string {
  return `
<script>
(function() {
  var HIGHLIGHT_ID = '__kiro_highlight__';

  function clearHighlight() {
    var existing = document.getElementById(HIGHLIGHT_ID);
    if (existing) existing.remove();
  }

  function highlightSection(sectionId) {
    clearHighlight();
    if (!sectionId) return;
    var el = document.querySelector('[data-section="' + sectionId + '"]');
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var overlay = document.createElement('div');
    overlay.id = HIGHLIGHT_ID;
    overlay.style.cssText = 'position:absolute;top:' + (rect.top + window.scrollY) + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;outline:2px solid #7c3aed;outline-offset:-1px;background:rgba(124,58,237,0.05);pointer-events:none;z-index:9999;border-radius:2px;transition:all 0.15s ease;';
    document.body.appendChild(overlay);
  }

  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.getAttribute && target.getAttribute('data-section')) {
        window.parent.postMessage({ type: 'section-click', sectionId: target.getAttribute('data-section') }, '*');
        return;
      }
      target = target.parentElement;
    }
    window.parent.postMessage({ type: 'section-click', sectionId: null }, '*');
  });

  highlightSection(${selectedSection ? JSON.stringify(selectedSection) : 'null'});
})();
</script>`;
}

export function TemplateCanvas({
  htmlContent,
  viewMode,
  previewMode,
  selectedSection,
  onSetViewMode,
  onSetPreviewMode,
  onSelectSection,
  onUpdateHtml,
}: TemplateCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [codeValue, setCodeValue] = useState(htmlContent);
  const [hasCodeChanges, setHasCodeChanges] = useState(false);

  // Sync code editor when htmlContent changes externally (not from code edits)
  useEffect(() => {
    setCodeValue(htmlContent);
    setHasCodeChanges(false);
  }, [htmlContent]);

  // Listen for section-click messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'section-click') {
        onSelectSection(e.data.sectionId);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectSection]);

  // Build the srcdoc with the highlight script injected before </body>
  const srcdoc = htmlContent
    ? htmlContent.replace('</body>', buildIframeScript(selectedSection) + '</body>')
    : '';

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodeValue(e.target.value);
    setHasCodeChanges(true);
  }, []);

  const handleApplyCode = useCallback(() => {
    onUpdateHtml(codeValue);
    setHasCodeChanges(false);
  }, [codeValue, onUpdateHtml]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + S to apply code changes
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasCodeChanges) {
        handleApplyCode();
      }
    }
  }, [hasCodeChanges, handleApplyCode]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => onSetViewMode('preview')}
            aria-label="Vista previa"
          >
            <Eye className="size-3.5" />
            Vista previa
          </Button>
          <Button
            variant={viewMode === 'code' ? 'default' : 'ghost'}
            size="xs"
            onClick={() => onSetViewMode('code')}
            aria-label="Código HTML"
          >
            <Code className="size-3.5" />
            Código
          </Button>
        </div>

        {/* Preview mode toggle (only in preview mode) */}
        <div className="flex items-center gap-1">
          {viewMode === 'preview' && (
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => onSetPreviewMode('desktop')}
                aria-label="Vista escritorio"
              >
                <Monitor className="size-3.5" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => onSetPreviewMode('mobile')}
                aria-label="Vista móvil"
              >
                <Smartphone className="size-3.5" />
              </Button>
            </div>
          )}

          {viewMode === 'code' && hasCodeChanges && (
            <Button size="xs" onClick={handleApplyCode} aria-label="Aplicar cambios">
              <Save className="size-3.5" />
              Aplicar
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        {viewMode === 'preview' ? (
          <div
            className={cn(
              'mx-auto h-full transition-all duration-200',
              previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
            )}
          >
            <iframe
              ref={iframeRef}
              srcDoc={srcdoc}
              title="Vista previa del email"
              className="h-full w-full rounded-md border bg-white shadow-sm"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="relative h-full">
            <textarea
              value={codeValue}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              className="h-full w-full resize-none rounded-md border bg-zinc-950 p-4 font-mono text-sm text-green-400 focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
              aria-label="Editor de código HTML"
            />
            {hasCodeChanges && (
              <div className="absolute bottom-3 right-3">
                <span className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs text-yellow-600 dark:text-yellow-400">
                  Cambios sin aplicar (Ctrl+S)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
