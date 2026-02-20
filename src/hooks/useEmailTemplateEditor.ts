'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ContentProperties,
  StyleProperties,
  TemplateConfig,
  EmailTemplate,
  EmailTemplateListItem,
} from '@/lib/email-templates/types';
import { serializeHtml } from '@/lib/email-templates/serializer';
import { parseHtml } from '@/lib/email-templates/parser';
import {
  defaultContentProperties,
  defaultStyleProperties,
  getDefaultTemplate,
} from '@/lib/email-templates/default-template';
import { useHistoryStack, type HistorySnapshot } from './useHistoryStack';
import { authFetch } from '@/lib/api/client';

const API_BASE = '/api/email-templates';

export interface EditorState {
  templates: EmailTemplateListItem[];
  activeTemplate: EmailTemplate | null;
  contentProperties: ContentProperties;
  styleProperties: StyleProperties;
  config: TemplateConfig;
  htmlContent: string;
  viewMode: 'preview' | 'code';
  previewMode: 'desktop' | 'mobile';
  selectedSection: string | null;
  isDirty: boolean;
  isLoading: boolean;
}

export interface EditorActions {
  loadTemplates: () => Promise<void>;
  selectTemplate: (id: string) => Promise<void>;
  createTemplate: () => Promise<void>;
  saveTemplate: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  updateContent: (partial: Partial<ContentProperties>) => void;
  updateStyle: (partial: Partial<StyleProperties>) => void;
  updateConfig: (partial: Partial<TemplateConfig>) => void;
  updateHtml: (html: string) => void;
  setViewMode: (mode: 'preview' | 'code') => void;
  setPreviewMode: (mode: 'desktop' | 'mobile') => void;
  selectSection: (sectionId: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exportHtml: () => void;
  sendTestEmail: (toEmail: string) => Promise<void>;
}

export type UseEmailTemplateEditor = EditorState & EditorActions;

/**
 * Validates that all required fields are filled before activating a template.
 * Returns an array of missing field names, or empty if all are valid.
 */
function validateForActivation(
  config: TemplateConfig,
  htmlContent: string
): string[] {
  const missing: string[] = [];
  if (!config.name.trim()) missing.push('name');
  if (!config.subject.trim()) missing.push('subject');
  if (!config.senderName.trim()) missing.push('senderName');
  if (!config.replyTo.trim()) missing.push('replyTo');
  if (!htmlContent.trim()) missing.push('htmlContent');
  return missing;
}

export function useEmailTemplateEditor(): UseEmailTemplateEditor {
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [contentProperties, setContentProperties] = useState<ContentProperties>({ ...defaultContentProperties });
  const [styleProperties, setStyleProperties] = useState<StyleProperties>({ ...defaultStyleProperties });
  const [config, setConfig] = useState<TemplateConfig>(getDefaultTemplate().config);
  const [htmlContent, setHtmlContent] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const history = useHistoryStack();
  const skipHistoryRef = useRef(false);

  // --- Helper: push current state to history before a change ---
  const pushHistory = useCallback(() => {
    history.push({
      contentProperties: { ...contentProperties },
      styleProperties: { ...styleProperties },
      htmlContent,
    });
  }, [contentProperties, styleProperties, htmlContent, history]);

  // --- Helper: apply a history snapshot ---
  const applySnapshot = useCallback((snapshot: HistorySnapshot) => {
    skipHistoryRef.current = true;
    setContentProperties(snapshot.contentProperties);
    setStyleProperties(snapshot.styleProperties);
    setHtmlContent(snapshot.htmlContent);
    setIsDirty(true);
  }, []);

  // --- API actions ---

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authFetch<EmailTemplateListItem[]>(API_BASE);
      setTemplates(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const template = await authFetch<EmailTemplate>(`${API_BASE}/${id}`);
      setActiveTemplate(template);
      setContentProperties(template.contentProperties);
      setStyleProperties(template.styleProperties);
      setConfig({
        name: template.name,
        subject: template.subject,
        senderName: template.senderName,
        replyTo: template.replyTo,
        triggerType: template.triggerType,
        status: template.status,
      });
      setHtmlContent(template.htmlContent);
      setIsDirty(false);
      setSelectedSection(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async () => {
    setIsLoading(true);
    try {
      const defaults = getDefaultTemplate();
      const html = serializeHtml(defaults.contentProperties, defaults.styleProperties);
      const created = await authFetch<EmailTemplate>(API_BASE, {
        method: 'POST',
        body: {
          name: `Nueva plantilla ${Date.now()}`,
          subject: '',
          senderName: '',
          replyTo: '',
          htmlContent: html,
          contentProperties: defaults.contentProperties,
          styleProperties: defaults.styleProperties,
          triggerType: defaults.config.triggerType,
          status: defaults.config.status,
        },
      });
      setActiveTemplate(created);
      setContentProperties(created.contentProperties);
      setStyleProperties(created.styleProperties);
      setConfig({
        name: created.name,
        subject: created.subject,
        senderName: created.senderName,
        replyTo: created.replyTo,
        triggerType: created.triggerType,
        status: created.status,
      });
      setHtmlContent(created.htmlContent);
      setIsDirty(false);
      await loadTemplates();
    } finally {
      setIsLoading(false);
    }
  }, [loadTemplates]);

  const saveTemplate = useCallback(async () => {
    if (!activeTemplate) return;
    setIsLoading(true);
    try {
      // Validate if trying to activate
      if (config.status === 'activa') {
        const missing = validateForActivation(config, htmlContent);
        if (missing.length > 0) {
          throw new Error(`Campos obligatorios faltantes: ${missing.join(', ')}`);
        }
      }
      const updated = await authFetch<EmailTemplate>(`${API_BASE}/${activeTemplate.id}`, {
        method: 'PUT',
        body: {
          name: config.name,
          subject: config.subject,
          senderName: config.senderName,
          replyTo: config.replyTo,
          htmlContent,
          contentProperties,
          styleProperties,
          triggerType: config.triggerType,
          status: config.status,
        },
      });
      setActiveTemplate(updated);
      setIsDirty(false);
      await loadTemplates();
    } finally {
      setIsLoading(false);
    }
  }, [activeTemplate, config, htmlContent, contentProperties, styleProperties, loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await authFetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (activeTemplate?.id === id) {
        setActiveTemplate(null);
        const defaults = getDefaultTemplate();
        setContentProperties(defaults.contentProperties);
        setStyleProperties(defaults.styleProperties);
        setConfig(defaults.config);
        setHtmlContent('');
        setIsDirty(false);
      }
      await loadTemplates();
    } finally {
      setIsLoading(false);
    }
  }, [activeTemplate, loadTemplates]);

  // --- Property update actions ---

  const updateContent = useCallback((partial: Partial<ContentProperties>) => {
    pushHistory();
    setContentProperties(prev => {
      const next = { ...prev, ...partial };
      setHtmlContent(serializeHtml(next, styleProperties));
      return next;
    });
    setIsDirty(true);
  }, [pushHistory, styleProperties]);

  const updateStyle = useCallback((partial: Partial<StyleProperties>) => {
    pushHistory();
    setStyleProperties(prev => {
      const next = { ...prev, ...partial };
      setHtmlContent(serializeHtml(contentProperties, next));
      return next;
    });
    setIsDirty(true);
  }, [pushHistory, contentProperties]);

  const updateConfig = useCallback((partial: Partial<TemplateConfig>) => {
    // Validate activation attempt
    if (partial.status === 'activa') {
      const nextConfig = { ...config, ...partial };
      const missing = validateForActivation(nextConfig, htmlContent);
      if (missing.length > 0) {
        throw new Error(`Campos obligatorios faltantes: ${missing.join(', ')}`);
      }
    }
    setConfig(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
  }, [config, htmlContent]);

  const updateHtml = useCallback((html: string) => {
    pushHistory();
    const { content, style } = parseHtml(html);
    setContentProperties(content);
    setStyleProperties(style);
    setHtmlContent(html);
    setIsDirty(true);
  }, [pushHistory]);

  // --- Undo / Redo ---

  const undo = useCallback(() => {
    const snapshot = history.undo();
    if (snapshot) applySnapshot(snapshot);
  }, [history, applySnapshot]);

  const redo = useCallback(() => {
    const snapshot = history.redo();
    if (snapshot) applySnapshot(snapshot);
  }, [history, applySnapshot]);

  // --- Export HTML ---

  const exportHtml = useCallback(() => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'plantilla'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [htmlContent, config.name]);

  // --- Send test email ---

  const sendTestEmail = useCallback(async (toEmail: string) => {
    if (!activeTemplate) return;
    await authFetch(`${API_BASE}/${activeTemplate.id}/send-test`, {
      method: 'POST',
      body: { to: toEmail },
    });
  }, [activeTemplate]);

  // --- Load templates on mount ---

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // State
    templates,
    activeTemplate,
    contentProperties,
    styleProperties,
    config,
    htmlContent,
    viewMode,
    previewMode,
    selectedSection,
    isDirty,
    isLoading,
    // Actions
    loadTemplates,
    selectTemplate,
    createTemplate,
    saveTemplate,
    deleteTemplate,
    updateContent,
    updateStyle,
    updateConfig,
    updateHtml,
    setViewMode,
    setPreviewMode,
    selectSection: setSelectedSection,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    exportHtml,
    sendTestEmail,
  };
}
