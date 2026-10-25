import type { Sky as SkyKind } from "@/lib/weather";

// The current sky as a small line drawing, in the same hand as the bench sketches, gently animated.
const CLOUD = "M11 25h19a6 6 0 0 0 .6-12 8 8 0 0 0-15.3-1.8A5.5 5.5 0 0 0 11 25z";

function Sun({ small }: { small?: boolean }) {
  const s = small ? 0.62 : 1;
  return (
    <g className="sky-sun" transform={small ? "translate(-7 -6)" : undefined}>
      <circle cx="20" cy="16" r={5.5 * s} className="sky-glow" />
      <g className="sky-rays" style={{ transformOrigin: "20px 16px" }}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4, r1 = 8.5 * s, r2 = 11.5 * s;
          return <path key={i} d={`M${20 + Math.cos(a) * r1} ${16 + Math.sin(a) * r1} L${20 + Math.cos(a) * r2} ${16 + Math.sin(a) * r2}`} />;
        })}
      </g>
    </g>
  );
}

function Moon({ small }: { small?: boolean }) {
  return (
    <g transform={small ? "translate(-9 -8) scale(.72)" : undefined} style={{ transformOrigin: "20px 16px" }}>
      <path className="sky-glow" d="M24 7a9 9 0 1 0 6.5 13.5A7.2 7.2 0 0 1 24 7z" />
      {!small && <><path className="sky-star" d="M9 8v3M7.5 9.5h3" /><path className="sky-star sky-star-2" d="M33 26v2M32 27h2" /></>}
    </g>
  );
}

export default function Sky({ kind, day }: { kind: SkyKind; day: boolean }) {
  const Light = day ? Sun : Moon;
  return (
    <svg viewBox="0 0 40 32" className={`sky sky-${kind}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {kind === "clear" && <Light />}
        {kind === "partly" && <><Light small /><path className="sky-drift" d={CLOUD} /></>}
        {kind === "overcast" && <><path className="sky-drift-back" d={CLOUD} transform="translate(-6 -6) scale(.8)" /><path className="sky-drift" d={CLOUD} /></>}
        {(kind === "rain" || kind === "storm" || kind === "snow") && <path d={CLOUD} transform="translate(0 -6)" />}
        {kind === "rain" && [12, 19, 26].map((x, i) => <path key={x} className="sky-drop" style={{ animationDelay: `${i * 0.35}s` }} d={`M${x} 22l-1.5 4`} />)}
        {kind === "snow" && [13, 20, 27].map((x, i) => <circle key={x} className="sky-drop" style={{ animationDelay: `${i * 0.5}s` }} cx={x} cy="23" r="0.9" />)}
        {kind === "storm" && <path className="sky-bolt" d="M21 18l-4 6h4l-3 6" />}
        {kind === "fog" && [10, 16, 22].map((y, i) => <path key={y} className="sky-fog" style={{ animationDelay: `${i * 0.6}s` }} d={`M${8 + i * 2} ${y}h${22 - i * 3}`} />)}
      </g>
    </svg>
  );
}
