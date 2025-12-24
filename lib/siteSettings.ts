// Global site settings cache for frontend display
let cachedSettings: {
  siteName: string;
  logoUrl: string;
  siteDescription: string;
  contactEmail: string;
  faviconUrl: string;
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
} | null = null;

export function getCachedSiteSettings() {
  return cachedSettings;
}

export function setCachedSiteSettings(settings: {
  siteName: string;
  logoUrl: string;
  siteDescription: string;
  contactEmail: string;
  faviconUrl: string;
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
}) {
  cachedSettings = settings;
}

export function clearCachedSiteSettings() {
  cachedSettings = null;
}
