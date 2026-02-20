import type { ContentProperties, StyleProperties } from './types';
import {
  defaultContentProperties,
  defaultStyleProperties,
} from './default-template';

/**
 * Extracts ContentProperties and StyleProperties from email HTML.
 * Uses a "best effort" strategy: each property is extracted independently,
 * defaults are used when parsing fails, and exceptions are never thrown.
 */
export function parseHtml(html: string): {
  content: ContentProperties;
  style: StyleProperties;
} {
  const content: ContentProperties = { ...defaultContentProperties };
  const style: StyleProperties = { ...defaultStyleProperties };

  try {
    // --- Content extraction via data-field attributes ---
    content.brandName = extractDataField(html, 'brandName') ?? defaultContentProperties.brandName;
    content.heroLabel = extractDataField(html, 'heroLabel') ?? defaultContentProperties.heroLabel;
    content.title = extractDataField(html, 'title') ?? defaultContentProperties.title;
    content.subtitle = extractDataField(html, 'subtitle') ?? defaultContentProperties.subtitle;
    content.ctaText = extractDataField(html, 'ctaText') ?? defaultContentProperties.ctaText;
    content.bodyText = extractDataField(html, 'bodyText') ?? defaultContentProperties.bodyText;
    content.footerText = extractDataField(html, 'footerText') ?? defaultContentProperties.footerText;

    // CTA URL: href of the <a> tag with data-field="ctaText"
    content.ctaUrl = extractCtaUrl(html) ?? defaultContentProperties.ctaUrl;

    // --- Style extraction ---

    // showNavigation: data-section="navigation" exists
    style.showNavigation = html.includes('data-section="navigation"');

    // showCards: data-section="cards" exists
    style.showCards = html.includes('data-section="cards"');

    // showSocialLinks: data-section="social" exists
    style.showSocialLinks = html.includes('data-section="social"');

    // showBackgroundPattern: data-background-pattern attribute
    style.showBackgroundPattern = extractBackgroundPattern(html);

    // heroBackgroundColor: background-color in the hero section td
    style.heroBackgroundColor =
      extractHeroBackgroundColor(html) ?? defaultStyleProperties.heroBackgroundColor;

    // accentColor: background-color of the CTA button td, or color of brandName
    style.accentColor = extractAccentColor(html) ?? defaultStyleProperties.accentColor;

    // titleFont: font-family of the title element (first value before comma)
    style.titleFont = extractTitleFont(html) ?? defaultStyleProperties.titleFont;
  } catch {
    // Never throw — return whatever we've extracted so far with defaults
  }

  return { content, style };
}

/**
 * Extracts text content from an element with a given data-field attribute.
 * Matches: data-field="fieldName">content</
 */
function extractDataField(html: string, fieldName: string): string | null {
  try {
    const regex = new RegExp(
      `data-field="${fieldName}"[^>]*>([\\s\\S]*?)</`,
      'i'
    );
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the CTA URL from the href of the <a> tag with data-field="ctaText".
 */
function extractCtaUrl(html: string): string | null {
  try {
    const regex = /href="([^"]*)"[^>]*data-field="ctaText"/i;
    const match = html.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the showBackgroundPattern value from data-background-pattern attribute.
 */
function extractBackgroundPattern(html: string): boolean {
  try {
    const regex = /data-background-pattern="([^"]*)"/i;
    const match = html.match(regex);
    if (match) {
      return match[1] === 'true';
    }
    return defaultStyleProperties.showBackgroundPattern;
  } catch {
    return defaultStyleProperties.showBackgroundPattern;
  }
}

/**
 * Extracts the hero background color from the hero section's inline style.
 * Looks for: data-section="hero" ... background-color:#hexcolor
 */
function extractHeroBackgroundColor(html: string): string | null {
  try {
    const regex = /data-section="hero"[^>]*style="[^"]*background-color:\s*([^;"\s]+)/i;
    const match = html.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extracts the accent color from the CTA button's background-color,
 * or falls back to the brand name's color style.
 */
function extractAccentColor(html: string): string | null {
  try {
    // Try CTA button: find the <td> with background-color right before <a data-field="ctaText">
    // The inner td has: style="background-color:#hex;..." followed by <a ... data-field="ctaText">
    const ctaRegex = /<td[^>]*style="[^"]*background-color:\s*([#\w]+)[^"]*"[^>]*>\s*<a[^>]*data-field="ctaText"/i;
    const ctaMatch = html.match(ctaRegex);
    if (ctaMatch) {
      return ctaMatch[1];
    }

    // Fallback: brand name color — style comes before data-field in the same td
    const brandRegex = /style="[^"]*color:\s*([^;"\s]+)[^"]*"[^>]*data-field="brandName"/i;
    const brandMatch = html.match(brandRegex);
    if (brandMatch) {
      return brandMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts the title font from the title element's font-family style.
 * Returns the first font name before the comma.
 * In the serializer output, style comes before data-field on the same td.
 */
function extractTitleFont(html: string): string | null {
  try {
    // Match: style="...font-family:FontName,..." ... data-field="title"
    const regex = /style="[^"]*font-family:\s*([^,;"]+)[^"]*"[^>]*data-field="title"/i;
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
