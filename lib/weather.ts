import { place } from "./content";

// What the sky is doing, in words and as one of the drawings in components/Sky.tsx.
export type Sky = "clear" | "partly" | "overcast" | "fog" | "rain" | "storm" | "snow";
export type Weather = { temp: number; sky: Sky; label: string; day: boolean } | null;

// WMO weather codes.
function read(code: number): [Sky, string] {
  if (code === 0) return ["clear", "clear"];
  if (code <= 2) return ["partly", "partly cloudy"];
  if (code === 3) return ["overcast", "overcast"];
  if (code <= 48) return ["fog", "fog"];
  if (code <= 57) return ["rain", "drizzle"];
  if (code <= 67) return ["rain", "rain"];
  if (code <= 77) return ["snow", "snow"];
  if (code <= 82) return ["rain", "showers"];
  return ["storm", "thunderstorm"];
}

// Open-Meteo: free, no key. Cached for 15 minutes; if it's down, the site shows the time without weather.
export async function getWeather(): Promise<Weather> {
  const q = new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon), current: "temperature_2m,weather_code,is_day", timezone: place.tz });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const c = (await res.json())?.current;
    if (!c) return null;
    const [sky, label] = read(c.weather_code);
    return { temp: Math.round(c.temperature_2m), sky, label, day: c.is_day === 1 };
  } catch {
    return null;
  }
}
