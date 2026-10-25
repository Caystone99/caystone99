import Link from "next/link";
import type { ReactNode } from "react";
import { elsewhere, person } from "@/lib/content";
import { getWeather } from "@/lib/weather";
import { SketchFilter } from "./Sketch";
import Stations from "./Stations";
import ThemeSwitch from "./ThemeSwitch";

// Every page's frame: the top bar with Cotonou's sky and the light/dark switch, and the footer.
export default async function Shell({ children }: { children: ReactNode }) {
  const weather = await getWeather();
  return (
    <>
      <SketchFilter />
      <div className="page">
        <header className="top">
          <nav className="top-nav" aria-label="Site">
            <Link href="/" className="handle">{person.name}</Link>
            <Link href="/notes" className="top-link">Notes</Link>
          </nav>
          <div className="top-end">
            <Stations weather={weather} />
            <ThemeSwitch />
          </div>
        </header>
        <main>{children}</main>
        <footer className="foot">
          <p className="foot-name">{person.name}<span className="foot-handle">@{person.handle}</span></p>
          <ul className="foot-links">
            <li><Link href="/notes">Notes</Link></li>
            {elsewhere.map((l) => <li key={l.label}><a href={l.href} rel="me noopener" target="_blank">{l.label}<span aria-hidden="true">↗</span></a></li>)}
          </ul>
          <p className="foot-note">Cotonou, Benin</p>
        </footer>
      </div>
    </>
  );
}
