export type TriggerType = 'automatico-registro' | 'manual-campana' | 'evento-disparado';
export type TemplateStatus = 'activa' | 'borrador' | 'pausada';

export interface ContentProperties {
  brandName: string;
  heroLabel: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  bodyText: string;
  footerText: string;
}

export interface StyleProperties {
  accentColor: string;
  heroBackgroundColor: string;
  titleFont: string;
  showNavigation: boolean;
  showCards: boolean;
  showBackgroundPattern: boolean;
  showSocialLinks: boolean;
}

export interface TemplateConfig {
  name: string;
  subject: string;
  senderName: string;
  replyTo: string;
  triggerType: TriggerType;
  status: TemplateStatus;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  senderName: string;
  replyTo: string;
  htmlContent: string;
  contentProperties: ContentProperties;
  styleProperties: StyleProperties;
  triggerType: TriggerType;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateListItem {
  id: string;
  name: string;
  status: TemplateStatus;
  triggerType: TriggerType;
  updatedAt: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  exampleValue: string;
}
