import type { CSSProperties } from "react";
import type { Entry } from "@/lib/content";

// Pen drawings for the notebook entries. One filter gives every line a slight hand-drawn wobble.
export function SketchFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <filter id="pen">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="1.4" />
      </filter>
    </svg>
  );
}

const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Each drawing moves in its own way (styles in globals.css, under "Bench motion"). Parts turn about a point in
// the drawing's own coordinates, and some wait a little (delay) so they move one after another.
const at = (x: number, y: number, delay?: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px`, ...(delay !== undefined ? { animationDelay: `${delay}s` } : {}) });
const wait = (delay: number): CSSProperties => ({ animationDelay: `${delay}s` });

// Two spokes, so a turning wheel looks like it's turning.
const spokes = (x: number, y: number, r: number) => `M${x - r} ${y} h${r * 2} M${x} ${y - r} v${r * 2}`;

export default function Sketch({ kind }: { kind: Entry["sketch"] }) {
  return (
    <svg viewBox="0 0 200 150" className={`sketch sketch-${kind}`} aria-hidden="true">
      <g filter="url(#pen)" {...common}>
        {kind === "arm" && (
          <>
            <path d="M40 132 h70" />
            <path d="M58 132 v-14 h34 v14" />
            <path d="M40 60 A 80 80 0 0 1 170 80" strokeDasharray="3 5" className="faint m-flow" />
            <g className="m-shoulder" style={at(75, 118)}>
              <path d="M75 118 L104 70" />
              <circle cx="75" cy="118" r="5" /><circle cx="104" cy="70" r="5" />
              <path d="M88 96 q8 -6 14 2" className="faint" />
              <g className="m-elbow" style={at(104, 70)}>
                <path d="M104 70 L150 52" />
                <circle cx="150" cy="52" r="4" />
                <path d="M150 52 l14 -8" className="m-jaw" style={at(150, 52)} />
                <path d="M150 52 l16 4" className="m-jaw m-jaw-low" style={at(150, 52)} />
              </g>
            </g>
          </>
        )}
        {kind === "hexapod" && (
          <>
            <g className="m-bob">
              <ellipse cx="100" cy="75" rx="26" ry="38" />
              <circle cx="100" cy="47" r="3" />
            </g>
            {/* A tripod gait: front and back on one side step with the middle of the other, then swap. */}
            {[[-1, -28], [-1, 0], [-1, 28], [1, -28], [1, 0], [1, 28]].map(([side, dy], i) => (
              <path key={i} d={`M${100 + side * 24} ${75 + dy} l${side * 26} ${dy * 0.3 - 6} l${side * 22} ${dy * 0.5 + 16}`}
                className={`m-leg ${side < 0 ? "m-leg-l" : "m-leg-r"}`} style={at(100 + side * 24, 75 + dy, [0, 4, 2].includes(i) ? 0 : -0.7)} />
            ))}
            <path d="M100 30 v-14 m-5 5 l5 -5 l5 5" className="faint m-ahead" />
          </>
        )}
        {kind === "wheels" && (
          <>
            <g className="m-bob">
              <path d="M62 100 L88 70 h36 L138 100" />
              <path d="M88 70 l-8 -14 h-10" />
              <rect x="96" y="56" width="22" height="14" rx="2" />
            </g>
            <circle cx="62" cy="100" r="24" /><circle cx="138" cy="100" r="24" />
            <path d={spokes(62, 100, 18)} className="faint m-spin" style={at(62, 100)} />
            <path d={spokes(138, 100, 18)} className="faint m-spin" style={at(138, 100)} />
            <circle cx="62" cy="100" r="3" /><circle cx="138" cy="100" r="3" />
            <path d="M40 132 h120" strokeDasharray="10 7" className="faint m-road" />
          </>
        )}
        {kind === "autonomy" && (
          <>
            <rect x="74" y="78" width="52" height="26" rx="6" />
            <circle cx="86" cy="108" r="8" /><circle cx="114" cy="108" r="8" />
            <path d={spokes(86, 108, 5)} className="faint m-spin" style={at(86, 108)} />
            <path d={spokes(114, 108, 5)} className="faint m-spin" style={at(114, 108)} />
            <circle cx="100" cy="72" r="5" />
            <path d="M100 66 m-16 -10 a 22 22 0 0 1 32 0" className="m-ping" style={wait(0)} />
            <path d="M100 66 m-26 -20 a 36 36 0 0 1 52 0" className="m-ping" style={wait(0.35)} />
            <path d="M100 66 m-36 -30 a 50 50 0 0 1 72 0" strokeDasharray="3 4" className="m-ping" style={wait(0.7)} />
            <path d="M30 126 h140" strokeDasharray="14 8" className="faint m-road" />
          </>
        )}
        {kind === "regen" && (
          <>
            <circle cx="64" cy="82" r="30" />
            <circle cx="64" cy="82" r="4" />
            <path d="M64 52 v12 M64 100 v12 M34 82 h12 M82 82 h12" className="faint m-spin m-spin-slow" style={at(64, 82)} />
            <rect x="128" y="62" width="40" height="40" rx="4" />
            <path d="M140 58 v4 M156 58 v4" />
            {/* The charge: bars light from the bottom up, then it starts again. */}
            {[0, 1, 2].map((n) => <rect key={n} x="134" y={90 - n * 10} width="28" height="6" rx="1.5" className="m-charge" style={wait(n * 0.6)} />)}
            <path d="M98 66 C 108 56, 118 56, 124 66" strokeDasharray="4 4" className="m-flow" />
            <path d="M119 63 l6 4 l1 -7" />
            <path d="M124 100 C 116 112, 104 112, 98 100" strokeDasharray="3 4" className="faint m-flow" />
          </>
        )}
        {kind === "swarm" && (
          <>
            {[[40, 50], [62, 40], [58, 70], [84, 58], [80, 88], [104, 74], [110, 46], [130, 64], [126, 96], [150, 82], [152, 54], [172, 70]].map(([x, y], i, a) => (
              <g key={i}>
                {a.slice(i + 1).filter(([x2, y2]) => Math.hypot(x2 - x, y2 - y) < 34).map(([x2, y2], j) => (
                  <path key={j} d={`M${x} ${y} L${x2} ${y2}`} className="faint" />
                ))}
                {/* A pulse passes through the swarm from left to right, each robot telling its neighbours. */}
                <circle cx={x} cy={y} r="3" className="m-node" style={at(x, y, (x - 40) / 90)} />
              </g>
            ))}
            <path d="M30 120 q70 -20 150 -6" strokeDasharray="3 5" className="faint m-flow" />
            <path d="M172 112 l8 2 l-6 6" className="faint" />
          </>
        )}
        {kind === "company" && (
          <>
            <path d="M24 118 h152" />
            <path d="M24 126 h152" className="faint" />
            {[40, 86, 132].map((x, i) => (
              <g key={i}>
                <rect x={x} y={52 - i * 6} width="30" height={44 + i * 6} rx="2" />
                <path d={`M${x + 15} ${96} v22`} />
                {/* Windows light up one by one, the way an office fills in the morning. */}
                <path d={`M${x + 8} ${64 - i * 6} h14`} className="m-window" style={wait(i * 0.9)} />
                <path d={`M${x + 8} ${72 - i * 6} h14`} className="m-window" style={wait(i * 0.9 + 0.45)} />
              </g>
            ))}
          </>
        )}
        {kind === "loop" && (
          <>
            <rect x="26" y="52" width="52" height="44" rx="4" />
            <rect x="122" y="52" width="52" height="44" rx="4" />
            <path d="M80 60 C 92 34, 108 34, 120 60" strokeDasharray="4 4" className="m-flow" />
            <path d="M113 55 l7 5 l1 -8" />
            <path d="M120 90 C 108 116, 92 116, 80 90" strokeDasharray="4 4" className="m-flow" />
            <path d="M87 95 l-7 -5 l-1 8" />
            <circle cx="52" cy="74" r="7" className="m-node" style={at(52, 74)} />
            {/* The reward, drawn again each episode. */}
            <path d="M136 82 l8 -10 l8 6 l8 -12" pathLength={1} className="m-draw" />
            <path d="M94 24 h12 M100 18 v12" className="faint m-node" style={at(100, 24, 1)} />
          </>
        )}
        {kind === "book" && (
          <>
            <path d="M100 42 q-34 -14 -66 0 v76 q32 -14 66 0" />
            <path d="M100 42 q34 -14 66 0 v76 q-32 -14 -66 0" />
            <path d="M100 42 v76" />
            {[56, 66, 76, 86].map((y) => <path key={y} d={`M46 ${y} q24 -6 44 0 M110 ${y} q24 -6 44 0`} className="faint" />)}
            {/* A page lifting from the right and settling on the left. */}
            <path d="M100 42 q34 -14 66 0 v76 q-32 -14 -66 0" className="m-page" style={at(100, 80)} />
          </>
        )}
      </g>
    </svg>
  );
}
