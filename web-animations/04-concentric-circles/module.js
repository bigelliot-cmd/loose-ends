// 04 Concentric circles: rings that follow the cursor, the inner ones more.
//
// Six circles on an 1880 × 1880 viewBox, centred, radius 933.97 stepping in
// by Δr = 70.05, stroke 11.52 thinning by 0.384 a ring. The 11-ring version
// keeps the pattern going toward the core.
//
// Each ring i (0 = outermost) follows the cursor by a weight that grows
// toward the core:  t = i/(N−1),  w = lerp(w_outer, 1, t^γ).
//   target = u · Δcenter_max · w · follow     (u = cursor offset, −1…1)
//   pull:     x += (target − x)·λ
//   parallax: the same toward −target
//   spring:   a = (target − x)·k; v = (v + a)·μ; x += v
// Colours: a blend between two Loose Ends tokens, or one token for every ring.
import { createLab } from "../shell/lab.js";
import { RAMPS, ramp } from "../shell/palette.js";
import { damp, loop, prefersReducedMotion, springStep, trackCursor } from "../shell/motion.js";

const defaults = await (await fetch("./config.json")).json();
const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW = 1880;
const C = 939.731;
const R0 = 933.97;
const DR = 70.05;
const STROKE0 = 11.52;
const DSTROKE = 0.384;

const stage = document.getElementById("stage");
const svg = document.createElementNS(SVG_NS, "svg");
svg.setAttribute("viewBox", `0 0 ${VIEW} ${VIEW}`);
svg.setAttribute("aria-hidden", "true");
stage.append(svg);
let rings = []; // { g, circle, x, y, sx: {x,v}, sy: {x,v} }

const MODES = [
  ["pull", "Magnetic pull"],
  ["parallax", "Parallax depth"],
  ["spring", "Elastic spring"],
];
const lab = createLab({
  module: "04-concentric-circles",
  number: "04",
  title: "Concentric Circles",
  defaults,
  presets: [
    { label: "Magnetic pull", values: { physicsMode: "pull" } },
    { label: "Parallax depth", values: { physicsMode: "parallax" } },
    { label: "Elastic spring", values: { physicsMode: "spring" } },
    { label: "Eleven rings", values: { ringTotal: 11 } },
  ],
  schema: [
    {
      group: "Rings",
      controls: [
        { key: "ringTotal", label: "Rings", type: "select", options: [["6", "6"], ["11", "11 (5 injected at the core)"]] },
        { key: "centreX", label: "Centre X (← →)", type: "range", min: -60, max: 60, step: 0.5, format: (v) => `${v > 0 ? "+" : ""}${v}% width` },
        { key: "centreY", label: "Centre Y (↑ ↓)", type: "range", min: -60, max: 60, step: 0.5, format: (v) => `${v > 0 ? "+" : ""}${v}% height` },
        { key: "bleedScale", label: "Size (× viewport)", type: "range", min: 0.5, max: 2, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
        { key: "colorMode", label: "Colours", type: "select", options: [...Object.keys(RAMPS).map((r) => [r, r]), ["single", "One colour"]] },
        { key: "ringColor", label: "One colour", type: "swatch" },
      ],
    },
    {
      group: "Follow",
      controls: [
        { key: "physicsMode", label: "Physics", type: "select", options: MODES },
        { key: "follow", label: "Overall follow", type: "range", min: 0, max: 2, step: 0.01 },
        { key: "centerShift", label: "Core travel, px (placeholder)", type: "range", min: 0, max: 300, step: 1, decimals: 0 },
        { key: "outerWeight", label: "Outer ring weight", type: "range", min: 0, max: 1, step: 0.01 },
        { key: "falloff", label: "Falloff γ", type: "range", min: 0.25, max: 5, step: 0.05 },
      ],
    },
    {
      group: "Physics",
      controls: [
        { key: "lerpDamping", label: "Pull / parallax damping (λ)", type: "range", min: 0.01, max: 0.3, step: 0.005, decimals: 3 },
        { key: "springStiffness", label: "Spring stiffness (k)", type: "range", min: 0.01, max: 0.3, step: 0.005, decimals: 3 },
        { key: "springFriction", label: "Spring friction (μ)", type: "range", min: 0.5, max: 0.98, step: 0.01 },
      ],
    },
  ],
  telemetry: [
    { key: "mode", label: "Mode" },
    { key: "cursor", label: "Cursor", extra: true },
    { key: "core", label: "Core offset", extra: true },
    { key: "fps", label: "FPS" },
  ],
  onChange: (c, key) => apply(key),
  onReset: () => {
    for (const r of rings) Object.assign(r, { x: 0, y: 0, sx: { x: 0, v: 0 }, sy: { x: 0, v: 0 } });
  },
});

const cursor = trackCursor(stage);
let autoT = 0;

function colours(n) {
  const c = lab.config;
  if (c.colorMode === "single") return Array(n).fill(c.ringColor);
  return ramp(c.colorMode, n);
}

function build() {
  const n = Number(lab.config.ringTotal);
  svg.replaceChildren();
  const cols = colours(n);
  rings = Array.from({ length: n }, (_, i) => {
    const g = document.createElementNS(SVG_NS, "g");
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", C);
    circle.setAttribute("cy", C);
    circle.setAttribute("r", (R0 - i * DR).toFixed(2));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-width", (STROKE0 - i * DSTROKE).toFixed(3));
    circle.setAttribute("stroke", cols[i]);
    g.append(circle);
    svg.append(g);
    return { g, circle, x: 0, y: 0, sx: { x: 0, v: 0 }, sy: { x: 0, v: 0 } };
  });
}

function recolour() {
  const cols = colours(rings.length);
  rings.forEach((r, i) => r.circle.setAttribute("stroke", cols[i]));
}

function size() {
  const s = Math.min(window.innerWidth, window.innerHeight) * lab.config.bleedScale;
  stage.style.setProperty("--ring-size", `${s}px`);
  // Where the rings sit: an offset from the window centre, as a share of the window (Elliot, 2026-10-24).
  stage.style.setProperty("--ring-x", `${(lab.config.centreX / 100) * window.innerWidth}px`);
  stage.style.setProperty("--ring-y", `${(lab.config.centreY / 100) * window.innerHeight}px`);
}

function apply(key) {
  if (key == null || key === "ringTotal") build();
  else if (["colorMode", "ringColor"].includes(key)) recolour();
  size();
}
window.addEventListener("resize", size);

function frame(dt, fps) {
  const c = lab.config;
  let ux = cursor.x;
  let uy = cursor.y;
  if (lab.auto) {
    // Presentation: a slow figure-of-eight instead of the cursor.
    autoT += dt;
    ux = Math.sin(autoT * 0.7) * 0.8;
    uy = Math.sin(autoT * 0.9 + 1) * 0.6;
  }
  const sign = c.physicsMode === "parallax" ? -1 : 1;
  const n = rings.length;
  for (let i = 0; i < n; i++) {
    const r = rings[i];
    const t = n > 1 ? i / (n - 1) : 1;
    const w = c.outerWeight + (1 - c.outerWeight) * Math.pow(t, c.falloff);
    const tx = sign * ux * c.centerShift * w * c.follow;
    const ty = sign * uy * c.centerShift * w * c.follow;
    if (c.physicsMode === "spring") {
      // The spring's constants are per 60 fps frame; step it that many times.
      const steps = Math.max(1, Math.round(dt * 60));
      for (let s = 0; s < steps; s++) {
        springStep(r.sx, tx, c.springStiffness, c.springFriction);
        springStep(r.sy, ty, c.springStiffness, c.springFriction);
      }
      r.x = r.sx.x;
      r.y = r.sy.x;
    } else {
      r.x = damp(r.x, tx, c.lerpDamping, dt);
      r.y = damp(r.y, ty, c.lerpDamping, dt);
      r.sx = { x: r.x, v: 0 };
      r.sy = { x: r.y, v: 0 };
    }
    r.g.setAttribute("transform", `translate(${r.x.toFixed(2)} ${r.y.toFixed(2)})`);
  }

  lab.track((ux + 1) / 2);
  const core = rings[n - 1];
  lab.telemetry({
    mode: MODES.find(([m]) => m === c.physicsMode)?.[1] ?? "",
    cursor: `${ux.toFixed(2)}, ${uy.toFixed(2)}`,
    core: core ? `${Math.hypot(core.x, core.y).toFixed(1)}px` : "—",
    fps: String(Math.round(fps)),
  });
}

apply(null);
if (prefersReducedMotion()) lab.config.lerpDamping = Math.max(lab.config.lerpDamping, 0.2);
loop(frame);
