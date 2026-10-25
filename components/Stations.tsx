"use client";

import { useEffect, useState } from "react";
import { place } from "@/lib/content";
import type { Weather } from "@/lib/weather";
import Sky from "./Sky";

// Cotonou's sky as a small animated drawing, and the time in West Africa Time. The weather in words is in the
// tooltip and for screen readers.
export default function Stations({ weather }: { weather: Weather }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const part = (o: Intl.DateTimeFormatOptions) => (now ? new Intl.DateTimeFormat("en-GB", { ...o, timeZone: place.tz }).format(now).padStart(2, "0") : "--");

  const words = weather ? `${weather.temp}°, ${weather.label}${weather.day ? "" : ", night"} in ${place.city}` : `Time in ${place.city}`;

  return (
    <div className="station" title={words} aria-label={`${words}. West Africa Time.`}>
      {weather && <Sky kind={weather.sky} day={weather.day} />}
      <span className="station-time" suppressHydrationWarning>
        {part({ hour: "2-digit", hour12: false })}<span className="station-colon">:</span>{part({ minute: "2-digit" })}
      </span>
      <span className="station-zone">WAT</span>
      {weather && <span className="station-temp">{weather.temp}°</span>}
    </div>
  );
}
