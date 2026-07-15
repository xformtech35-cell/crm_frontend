/**
 * Currency configuration and conversion utilities.
 * Default base currency is INR (Indian Rupee).
 */

export const BASE_CURRENCY = 'INR';

export const CURRENCY_CONFIGS = {
  inr: { code: 'INR', symbol: '₹', locale: 'en-IN', rate: 1.0, icon: 'mdi:currency-inr' },
  usd: { code: 'USD', symbol: '$', locale: 'en-US', rate: 83.5, icon: 'mdi:currency-usd' },
  gbp: { code: 'GBP', symbol: '£', locale: 'en-GB', rate: 105.0, icon: 'mdi:currency-gbp' },
  eur: { code: 'EUR', symbol: '€', locale: 'de-DE', rate: 90.0, icon: 'mdi:currency-eur' },
  aed: { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', rate: 22.7, icon: 'mdi:cash-multiple' },
  sar: { code: 'SAR', symbol: 'ر.س', locale: 'ar-SA', rate: 22.3, icon: 'mdi:cash-multiple' },
  cad: { code: 'CAD', symbol: 'CA$', locale: 'en-CA', rate: 61.0, icon: 'mdi:currency-usd' },
  aud: { code: 'AUD', symbol: 'A$', locale: 'en-AU', rate: 55.5, icon: 'mdi:currency-usd' },
  sgd: { code: 'SGD', symbol: 'S$', locale: 'en-SG', rate: 61.5, icon: 'mdi:currency-usd' },
};

export const COUNTRY_MAP = {
  // India
  india: 'inr',
  in: 'inr',
  
  // USA
  'united states': 'usd',
  'united states of america': 'usd',
  usa: 'usd',
  us: 'usd',
  america: 'usd',
  
  // United Kingdom
  'united kingdom': 'gbp',
  uk: 'gbp',
  gb: 'gbp',
  britain: 'gbp',
  england: 'gbp',
  
  // UAE
  'united arab emirates': 'aed',
  uae: 'aed',
  dubai: 'aed',
  'abu dhabi': 'aed',
  
  // Saudi Arabia
  'saudi arabia': 'sar',
  saudi: 'sar',
  ksa: 'sar',
  
  // Eurozone
  europe: 'eur',
  euro: 'eur',
  germany: 'eur',
  france: 'eur',
  italy: 'eur',
  spain: 'eur',
  netherlands: 'eur',
  belgium: 'eur',
  ireland: 'eur',
  austria: 'eur',
  portugal: 'eur',
  finland: 'eur',
  greece: 'eur',

  // Canada
  canada: 'cad',
  ca: 'cad',

  // Australia
  australia: 'aud',
  au: 'aud',

  // Singapore
  singapore: 'sgd',
  sg: 'sgd',
};

/**
 * Get currency configuration for a given country name or country/currency code.
 */
export function getCurrencyConfig(countryName) {
  const country = countryName || appDefaultCountry;
  if (!country) return CURRENCY_CONFIGS.inr;
  
  const norm = String(country).trim().toLowerCase();
  
  // Check direct config match (e.g. if code is passed directly: "usd")
  if (CURRENCY_CONFIGS[norm]) {
    return CURRENCY_CONFIGS[norm];
  }
  
  // Check country map match
  const code = COUNTRY_MAP[norm];
  if (code && CURRENCY_CONFIGS[code]) {
    return CURRENCY_CONFIGS[code];
  }
  
  // Fallback to INR
  return CURRENCY_CONFIGS.inr;
}

/**
 * Convert local currency to base currency (INR)
 */
export function convertToBase(amount, countryName) {
  if (amount == null || amount === '' || isNaN(Number(amount))) return undefined;
  const config = getCurrencyConfig(countryName);
  return Number(amount) * config.rate;
}

/**
 * Convert base currency (INR) to local currency
 */
export function convertFromBase(amount, countryName) {
  if (amount == null || amount === '' || isNaN(Number(amount))) return '';
  const config = getCurrencyConfig(countryName);
  return Number(amount) / config.rate;
}

/**
 * Format an amount that is in base currency (INR) by converting it to target country currency first.
 */
export function formatCurrencyByCountry(baseValue, countryName) {
  if (baseValue == null) return '—';
  const config = getCurrencyConfig(countryName);
  const localValue = convertFromBase(baseValue, countryName);
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    maximumFractionDigits: 0,
  }).format(localValue);
}

/**
 * Format a value already in local currency.
 */
export function formatLocalCurrency(localValue, countryName) {
  if (localValue == null) return '—';
  const config = getCurrencyConfig(countryName);
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    maximumFractionDigits: 0,
  }).format(Number(localValue));
}

/**
 * Format base currency (INR) directly.
 */
export function formatBaseCurrency(baseValue) {
  if (baseValue == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(baseValue));
}

/**
 * Format base currency (INR) in a compact form (e.g. 10K, 1L, 1Cr, 1.2M) based on target country's style.
 */
export function formatCurrencyCompact(baseValue, countryName) {
  if (baseValue == null) return '—';
  const config = getCurrencyConfig(countryName);
  const localValue = convertFromBase(baseValue, countryName);
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(localValue);
}

// Heuristic detection based on browser timezone and language
function detectLocaleHeuristics() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const lowerTz = tz.toLowerCase();
      if (lowerTz.includes('kolkata') || lowerTz.includes('calcutta')) return 'India';
      if (lowerTz.includes('america')) return 'United States';
      if (lowerTz.includes('london')) return 'United Kingdom';
      if (lowerTz.includes('dubai')) return 'United Arab Emirates';
      if (lowerTz.includes('saudi') || lowerTz.includes('riyadh')) return 'Saudi Arabia';
      if (lowerTz.includes('sydney') || lowerTz.includes('melbourne') || lowerTz.includes('australia')) return 'Australia';
      if (lowerTz.includes('toronto') || lowerTz.includes('vancouver') || lowerTz.includes('canada')) return 'Canada';
      if (lowerTz.includes('singapore')) return 'Singapore';
      if (lowerTz.includes('europe')) return 'Germany';
    }
    
    const lang = navigator.language || navigator.userLanguage;
    if (lang) {
      const lowerLang = lang.toLowerCase();
      if (lowerLang.endsWith('-us')) return 'United States';
      if (lowerLang.endsWith('-gb')) return 'United Kingdom';
      if (lowerLang.endsWith('-in')) return 'India';
      if (lowerLang.endsWith('-ca')) return 'Canada';
      if (lowerLang.endsWith('-au')) return 'Australia';
      if (lowerLang.endsWith('-sg')) return 'Singapore';
    }
  } catch (e) {
    console.error("Heuristics detection failed:", e);
  }
  return 'India'; // absolute fallback
}

// Get from cache if available
let cachedCountry = typeof window !== 'undefined' ? localStorage.getItem('app_detected_country') : null;
let appDefaultCountry = cachedCountry || detectLocaleHeuristics();

export function getAppDefaultCountry() {
  return appDefaultCountry;
}

export function setAppDefaultCountry(country) {
  appDefaultCountry = country;
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_detected_country', country);
  }
}

if (typeof window !== "undefined") {
  try {
    // Check if country is already cached
    const cachedCountry = localStorage.getItem("app_detected_country");

    if (cachedCountry) {
      appDefaultCountry = cachedCountry;
      console.log("Using cached country:", cachedCountry);
    } else {
      fetch("https://ipapi.co/json/")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data?.country_name) {
            console.log("GeoIP detected country:", data.country_name);

            const oldCountry = appDefaultCountry;
            appDefaultCountry = data.country_name;

            localStorage.setItem(
              "app_detected_country",
              data.country_name
            );

            if (oldCountry !== data.country_name) {
              window.dispatchEvent(
                new CustomEvent("app-currency-changed")
              );
            }
          }
        })
        .catch((err) => {
          console.warn("GeoIP lookup failed:", err);

          // Fallback country
          appDefaultCountry = "India";

          localStorage.setItem(
            "app_detected_country",
            "India"
          );

          window.dispatchEvent(
            new CustomEvent("app-currency-changed")
          );
        });
    }
  } catch (e) {
    console.warn("GeoIP fetch failed:", e);

    appDefaultCountry = "India";

    localStorage.setItem(
      "app_detected_country",
      "India"
    );
  }
}


