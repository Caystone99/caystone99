"use client";

import { useEffect, useRef } from "react";

// A faint marbled pattern behind the home page: domain-warped noise, like KhronaHQ's hero, kept well back so it
// reads as texture rather than a picture. Colours come from the stylesheet and follow light and dark.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_paper;
uniform vec3 u_tint;
uniform vec3 u_pen;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.4 + 3.1;
  float t = u_time * 0.025;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.3), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 3.5 * r);

  // Low weights on purpose: the pattern only just lifts off the paper.
  vec3 col = mix(u_paper, u_tint, smoothstep(0.25, 0.9, f) * 0.45);
  col = mix(col, u_pen, smoothstep(0.62, 1.0, f * f * 1.6) * 0.14);
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.008;
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

function rgb(value: string): [number, number, number] {
  const hex = value.trim().replace("#", "");
  const n = parseInt(hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function Marble() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res"), uTime = gl.getUniformLocation(prog, "u_time");

    // Re-read the colours whenever the theme switch flips data-theme on <html>.
    const colours = () => {
      const css = getComputedStyle(document.documentElement);
      gl.uniform3fv(gl.getUniformLocation(prog, "u_paper"), rgb(css.getPropertyValue("--paper")));
      gl.uniform3fv(gl.getUniformLocation(prog, "u_tint"), rgb(css.getPropertyValue("--marble")));
      gl.uniform3fv(gl.getUniformLocation(prog, "u_pen"), rgb(css.getPropertyValue("--pen")));
    };
    colours();
    const theme = new MutationObserver(colours);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Soft by design, so it's drawn at reduced resolution to keep the GPU cost low.
    const scale = Math.min(window.devicePixelRatio, 1.5) * 0.5;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      // Nothing to draw while the tab is in the background.
      if (!document.hidden) { gl.uniform1f(uTime, still ? 20 : (now - start) / 1000 + 20); gl.drawArrays(gl.TRIANGLES, 0, 3); }
      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    canvas.dataset.ready = "true";
    return () => { cancelAnimationFrame(frame); ro.disconnect(); theme.disconnect(); };
  }, []);

  return <canvas ref={ref} className="marble" aria-hidden="true" />;
}
