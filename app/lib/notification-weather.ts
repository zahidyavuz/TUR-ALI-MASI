/**
 * Hava durumu: Open-Meteo (ücretsiz) ile anlık durum ve değişiklik uyarısı.
 */

const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
  'Nevşehir': { lat: 38.62, lon: 34.72 },
  'Nevsehir': { lat: 38.62, lon: 34.72 },
  'Kapadokya': { lat: 38.62, lon: 34.72 },
  'Roma': { lat: 41.9, lon: 12.5 },
  'Malé': { lat: 4.17, lon: 73.51 },
  'Tokyo': { lat: 35.68, lon: 139.69 },
  'Tromso': { lat: 69.65, lon: 18.96 },
  'Napoli': { lat: 40.85, lon: 14.27 },
  'Gaziantep': { lat: 37.07, lon: 37.38 },
  'Fethiye': { lat: 36.62, lon: 29.12 },
  'Bali': { lat: -8.41, lon: 115.19 },
  'Kyoto': { lat: 35.01, lon: 135.77 },
};

function normalizeLocation(location: string): string {
  return location
    .split(',')[0]
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function findCoords(location: string): { lat: number; lon: number } | null {
  const normalized = normalizeLocation(location);
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (normalized.includes(key.toLowerCase())) return coords;
  }
  return null;
}

export interface WeatherSnapshot {
  temp: number;
  weatherCode: number;
  condition: string;
  date: string; // ISO date
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'açık',
  1: 'az bulutlu',
  2: 'parçalı bulutlu',
  3: 'bulutlu',
  45: 'sis',
  48: 'sis',
  51: 'çisenti',
  53: 'çisenti',
  55: 'çisenti',
  61: 'yağmur',
  63: 'yağmur',
  65: 'şiddetli yağmur',
  71: 'kar',
  73: 'kar',
  75: 'kar',
  77: 'kar',
  80: 'sağanak',
  81: 'sağanak',
  82: 'sağanak',
  85: 'kar sağanağı',
  86: 'kar sağanağı',
  95: 'gök gürültülü',
  96: 'gök gürültülü fırtına',
  99: 'gök gürültülü fırtına',
};

function codeToCondition(code: number): string {
  return WEATHER_CODE_MAP[code] ?? 'bilinmiyor';
}

export async function fetchWeather(location: string): Promise<WeatherSnapshot | null> {
  const coords = findCoords(location);
  if (!coords) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (!current) return null;
    const date = new Date().toISOString().slice(0, 10);
    return {
      temp: Math.round(Number(current.temperature_2m) ?? 0),
      weatherCode: Number(current.weather_code) ?? 0,
      condition: codeToCondition(Number(current.weather_code)),
      date,
    };
  } catch {
    return null;
  }
}

const STORAGE_WEATHER = 'melih_tours_weather_cache';

function getWeatherCache(): Record<string, { snapshot: WeatherSnapshot; fetched: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_WEATHER);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setWeatherCache(key: string, snapshot: WeatherSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getWeatherCache();
    cache[key] = { snapshot, fetched: new Date().toISOString() };
    localStorage.setItem(STORAGE_WEATHER, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/** Önemli değişiklik: yağmur/kar/sis veya sıcaklık 5°C+ fark. */
export function isSignificantWeatherChange(
  prev: WeatherSnapshot | null,
  next: WeatherSnapshot
): boolean {
  if (!prev) return true;
  const tempDiff = Math.abs(next.temp - prev.temp);
  if (tempDiff >= 5) return true;
  const badCodes = [45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
  const prevBad = badCodes.includes(prev.weatherCode);
  const nextBad = badCodes.includes(next.weatherCode);
  if (!prevBad && nextBad) return true; // şimdi kötü hava
  return false;
}

export function getLocationCacheKey(location: string): string {
  return normalizeLocation(location);
}

export async function getWeatherAndDetectChange(
  location: string
): Promise<{ snapshot: WeatherSnapshot; significantChange: boolean } | null> {
  const key = getLocationCacheKey(location);
  const cache = getWeatherCache();
  const prev = cache[key]?.snapshot ?? null;

  const snapshot = await fetchWeather(location);
  if (!snapshot) return null;

  setWeatherCache(key, snapshot);
  const significantChange = isSignificantWeatherChange(prev, snapshot);
  return { snapshot, significantChange };
}
