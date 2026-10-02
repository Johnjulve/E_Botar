/**
 * Theme Engine & Color Token Generator for Dynamic Multi-Institution Theming
 * E-Botar v4.0.0
 */

export const DEFAULT_INSTITUTION_PRESETS = [
  {
    id: 'snsu_client',
    name: 'Surigao del Norte State University (SNSU)',
    institution_name: 'SURIGAO DEL NORTE',
    institution_name_line2: 'STATE UNIVERSITY',
    institution_acronym: 'SNSU',
    app_name: 'E-Botar',
    tagline: 'Student Government Electronic Voting System',
    primaryColor: '#0b6e3b',
    secondaryColor: '#f4cc5c',
    description: 'Main campus client configuration with Emerald and Yellow identity.',
    canDelete: true,
  },
  {
    id: 'up_diliman',
    name: 'University of the Philippines (Diliman)',
    institution_name: 'UNIVERSITY OF THE PHILIPPINES',
    institution_name_line2: 'DILIMAN',
    institution_acronym: 'UPD',
    app_name: 'E-Botar',
    tagline: 'University Student Council Electronic Voting',
    primaryColor: '#7b1113',
    secondaryColor: '#f59e0b',
    description: 'Traditional collegiate maroon with warm golden amber accents.',
    canDelete: true,
  },
  {
    id: 'admu',
    name: 'Ateneo de Manila University',
    institution_name: 'ATENEO DE MANILA',
    institution_name_line2: 'UNIVERSITY',
    institution_acronym: 'ADMU',
    app_name: 'E-Botar',
    tagline: 'Sanggunian ng mga Mag-aaral Elections',
    primaryColor: '#0f4c81',
    secondaryColor: '#f59e0b',
    description: 'Authoritative deep royal navy with golden amber.',
    canDelete: true,
  },
  {
    id: 'dlsu',
    name: 'De La Salle University',
    institution_name: 'DE LA SALLE',
    institution_name_line2: 'UNIVERSITY',
    institution_acronym: 'DLSU',
    app_name: 'E-Botar',
    tagline: 'University Student Government Elections',
    primaryColor: '#00703c',
    secondaryColor: '#cbd5e1',
    description: 'Crisp Archers Green with slate accent.',
    canDelete: true,
  },
  {
    id: 'ust',
    name: 'University of Santo Tomas',
    institution_name: 'UNIVERSITY OF SANTO TOMAS',
    institution_name_line2: 'MANILA',
    institution_acronym: 'UST',
    app_name: 'E-Botar',
    tagline: 'Central Student Council Elections',
    primaryColor: '#1f2937',
    secondaryColor: '#f59e0b',
    description: 'Black and Gold Tiger collegiate theme.',
    canDelete: true,
  },
];

export const THEME_PRESETS = DEFAULT_INSTITUTION_PRESETS;

const PRESETS_STORAGE_KEY = 'ebotar_institution_presets';

export function loadSavedPresets() {
  if (typeof window === 'undefined') return DEFAULT_INSTITUTION_PRESETS;
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_INSTITUTION_PRESETS;
}

export function savePresetsToStorage(presets) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore
  }
}


/**
 * Parses 3-digit or 6-digit hex color into RGB object
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB to HSL
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL back to Hex string
 */
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Calculates a complete cohesive palette from a base primary hex color
 */
export function computeThemeTokens(primaryHex, secondaryHex) {
  const primaryRgb = hexToRgb(primaryHex) || { r: 11, g: 110, b: 59 };
  const secondaryRgb = hexToRgb(secondaryHex) || { r: 244, g: 204, b: 92 };

  const primaryHsl = rgbToHsl(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  const secondaryHsl = rgbToHsl(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);

  // Hover: slightly darker/deeper
  const hoverH = primaryHsl.h;
  const hoverS = Math.min(100, primaryHsl.s + 3);
  const hoverL = Math.max(12, primaryHsl.l - 8);
  const primaryHover = hslToHex(hoverH, hoverS, hoverL);

  // Active: deeper still
  const activeL = Math.max(8, primaryHsl.l - 15);
  const primaryActive = hslToHex(hoverH, hoverS, activeL);

  // Light / Accent
  const lightL = Math.min(85, primaryHsl.l + 12);
  const primaryLight = hslToHex(primaryHsl.h, primaryHsl.s, lightL);

  // Soft Background: light 96%
  const softBg = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.08)`;
  // Soft Border: light 78%
  const softBorder = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.22)`;
  // Soft Text: darker saturated version for accessible contrast
  const softTextL = Math.min(28, Math.max(10, primaryHsl.l - 12));
  const softText = hslToHex(primaryHsl.h, Math.min(100, primaryHsl.s + 10), softTextL);

  // Secondary Hover
  const secHoverL = Math.max(15, secondaryHsl.l - 8);
  const secondaryHover = hslToHex(secondaryHsl.h, secondaryHsl.s, secHoverL);

  return {
    primaryColor: primaryHex,
    primaryHover,
    primaryActive,
    primaryLight,
    primarySoftBg: softBg,
    primarySoftBorder: softBorder,
    primarySoftText: softText,
    secondaryColor: secondaryHex,
    secondaryHover,
    primaryRgb: `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
    secondaryRgb: `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
  };
}

/**
 * Injects CSS variables onto document.documentElement and updates document title / favicon
 */
export function applyThemeToDocument(branding = {}) {
  if (typeof document === 'undefined') return;

  const primary = branding.primary_color || '#0b6e3b';
  const secondary = branding.secondary_color || '#f4cc5c';
  const tokens = computeThemeTokens(primary, secondary);
  const root = document.documentElement;

  // Main primary tokens
  root.style.setProperty('--primary-color', tokens.primaryColor);
  root.style.setProperty('--primary-hover', tokens.primaryHover);
  root.style.setProperty('--primary-active', tokens.primaryActive);
  root.style.setProperty('--primary-soft-bg', tokens.primarySoftBg);
  root.style.setProperty('--primary-soft-border', tokens.primarySoftBorder);
  root.style.setProperty('--primary-soft-text', tokens.primarySoftText);
  root.style.setProperty('--primary-rgb', tokens.primaryRgb);

  // Legacy brand tokens mapped for seamless backwards-compatibility
  root.style.setProperty('--brand-green', tokens.primaryColor);
  root.style.setProperty('--brand-green-dark', tokens.primaryHover);
  root.style.setProperty('--brand-green-light', tokens.primaryLight);

  // Secondary / Accent tokens
  root.style.setProperty('--brand-yellow', tokens.secondaryColor);
  root.style.setProperty('--brand-yellow-dark', tokens.secondaryHover);
  root.style.setProperty('--accent-color', tokens.secondaryColor);
  root.style.setProperty('--secondary-color', tokens.secondaryColor);
  root.style.setProperty('--secondary-rgb', tokens.secondaryRgb);

  // Dynamic Topbar & Sidebar layout theme adaptation
  root.style.setProperty('--topbar-bg', `linear-gradient(135deg, ${tokens.primaryColor} 0%, ${tokens.primaryHover} 100%)`);
  root.style.setProperty('--sidebar-bg', tokens.secondaryColor);
  root.style.setProperty('--sidebar-item-active-bg', tokens.secondaryHover);
  root.style.setProperty('--sidebar-item-active-text', '#111827');


  // Dynamic Favicon Update (Primary Logo also serves as Favicon, falling back to /favicon.png)
  const faviconUrl = branding.institution_favicon_url || branding.institution_logo_url || '/favicon.png';
  if (faviconUrl) {
    let faviconLink = document.querySelector("link[rel~='icon']");
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(faviconLink);
    }
    faviconLink.href = faviconUrl;
  }
}

