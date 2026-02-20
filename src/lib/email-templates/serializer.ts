import type { ContentProperties, StyleProperties } from './types';

/**
 * Generates email-compatible HTML from content and style properties.
 * Uses <table> layout and inline styles for Gmail, Outlook, Apple Mail compatibility.
 * Sections are marked with data-section attributes for canvas selection.
 */
export function serializeHtml(
  content: ContentProperties,
  style: StyleProperties
): string {
  const sections: string[] = [];

  // Navigation section
  if (style.showNavigation && content.brandName) {
    sections.push(renderNavigation(content, style));
  }

  // Hero section
  sections.push(renderHero(content, style));

  // CTA button section
  if (content.ctaText) {
    sections.push(renderCta(content, style));
  }

  // Body section
  if (content.bodyText) {
    sections.push(renderBody(content));
  }

  // Cards section
  if (style.showCards) {
    sections.push(renderCards(style));
  }

  // Footer section
  if (content.footerText) {
    sections.push(renderFooter(content, style));
  }

  return wrapDocument(sections.join('\n'));
}

function wrapDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:20px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
${body}
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function renderNavigation(content: ContentProperties, style: StyleProperties): string {
  return `<tr>
<td data-section="navigation" style="background-color:#ffffff;padding:16px 24px;border-bottom:2px solid ${style.accentColor};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:${style.accentColor};" data-field="brandName">${content.brandName}</td>
</tr>
</table>
</td>
</tr>`;
}

function renderHero(content: ContentProperties, style: StyleProperties): string {
  const bgPattern = style.showBackgroundPattern
    ? `background-image:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.15)"/></svg>');background-repeat:repeat;`
    : '';

  const heroLabelHtml = content.heroLabel
    ? `<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;color:${style.accentColor};padding-bottom:12px;text-transform:uppercase;" data-field="heroLabel">${content.heroLabel}</td>
</tr>`
    : '';

  const titleHtml = content.title
    ? `<tr>
<td style="font-family:${style.titleFont},Arial,Helvetica,sans-serif;font-size:32px;font-weight:bold;color:#ffffff;padding-bottom:8px;line-height:1.2;" data-field="title">${content.title}</td>
</tr>`
    : '';

  const subtitleHtml = content.subtitle
    ? `<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:rgba(255,255,255,0.85);padding-bottom:8px;line-height:1.5;" data-field="subtitle">${content.subtitle}</td>
</tr>`
    : '';

  return `<tr>
<td data-section="hero" style="background-color:${style.heroBackgroundColor};padding:48px 24px;${bgPattern}" data-background-pattern="${style.showBackgroundPattern}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${heroLabelHtml}${titleHtml}${subtitleHtml}</table>
</td>
</tr>`;
}

function renderCta(content: ContentProperties, style: StyleProperties): string {
  return `<tr>
<td data-section="cta" style="background-color:#ffffff;padding:24px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="background-color:${style.accentColor};border-radius:6px;padding:12px 32px;">
<a href="${content.ctaUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;display:inline-block;" data-field="ctaText">${content.ctaText}</a>
</td>
</tr>
</table>
</td>
</tr>`;
}

function renderBody(content: ContentProperties): string {
  return `<tr>
<td data-section="body" style="background-color:#ffffff;padding:24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;line-height:1.6;" data-field="bodyText">${content.bodyText}</td>
</tr>
</table>
</td>
</tr>`;
}

function renderCards(style: StyleProperties): string {
  return `<tr>
<td data-section="cards" style="background-color:#ffffff;padding:24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td width="48%" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#111827;padding-bottom:4px;">Card 1</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">Description for card 1</td></tr>
</table>
</td>
<td width="4%">&nbsp;</td>
<td width="48%" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#111827;padding-bottom:4px;">Card 2</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">Description for card 2</td></tr>
</table>
</td>
</tr>
</table>
</td>
</tr>`;
}

function renderFooter(content: ContentProperties, style: StyleProperties): string {
  const socialLinksHtml = style.showSocialLinks
    ? `<tr>
<td data-section="social" style="padding-bottom:16px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="padding:0 8px;"><a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${style.accentColor};text-decoration:none;">Twitter</a></td>
<td style="padding:0 8px;"><a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${style.accentColor};text-decoration:none;">Facebook</a></td>
<td style="padding:0 8px;"><a href="#" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${style.accentColor};text-decoration:none;">Instagram</a></td>
</tr>
</table>
</td>
</tr>`
    : '';

  return `<tr>
<td data-section="footer" style="background-color:#f9fafb;padding:24px;border-top:1px solid #e5e7eb;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${socialLinksHtml}<tr>
<td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;line-height:1.5;" align="center" data-field="footerText">${content.footerText}</td>
</tr>
</table>
</td>
</tr>`;
}
