// 01 Torus Row (stationary multi-torus wave).
//
// N rings fixed on the X axis: x_i = (i − c)·s, c = (N − 1)/2. Scroll turns
// a shared angle Θ, and each ring's Y rotation follows one of four waves:
//   V-wave       θ_i = Θ + π/2 − |i − c|·Δφ
//   Conveyor     θ_i = Θ + i·Δφ
//   Lockstep     θ_i = Θ
//   Counter-spin θ_i = Θ·(−1)^i + i·Δφ
// Speed tips the row: θX_i = clamp(±θmax, v·15·θmax)·((i − c)/c), and a
// small roll θZ_i = sin(Θ + (i − c)·0.3)·0.04.
// Δφ and θmax: the defaults here are a starting point.
import { createLab } from "../shell/lab.js";
import { createRingStage, ringOutline } from "../shell/ring-stage.js";
import { clamp, damp, deg, loop, rad, virtualScroll } from "../shell/motion.js";

const defaults = await (await fetch("./config.json")).json();
const stageEl = document.getElementById("stage");
const S = createRingStage(stageEl, { fov: defaults.fov });
const { THREE } = S;
const row = new THREE.Group();
S.scene.add(row);
let rings = [];
let geometry = null;

const WAVES = [
  ["v-wave", "Symmetric V-wave"],
  ["conveyor", "Travelling conveyor"],
  ["lockstep", "Synchronous lockstep"],
  ["counter", "Alternating counter-spin"],
];
const SHORT = { "v-wave": "V-wave", conveyor: "Conveyor", lockstep: "Lockstep", counter: "Counter-spin" };
const degFmt = (v) => `${Math.round(v)}°`;

const lab = createLab({
  module: "01-scroll-3d-element",
  number: "01",
  title: "Torus Row",
  defaults,
  presets: WAVES.map(([mode]) => ({ label: SHORT[mode], values: { waveMode: mode } })),
  schema: [
    {
      group: "Row",
      controls: [
        { key: "ringCount", label: "Rings", type: "range", min: 3, max: 25, step: 2, decimals: 0 },
        { key: "spacing", label: "Spacing", type: "range", min: 0.2, max: 1.5, step: 0.01 },
        { key: "ringRadius", label: "Ring radius (placeholder)", type: "range", min: 0.05, max: 2, step: 0.01 },
        { key: "tubeThickness", label: "Tube thickness", type: "range", min: 0.002, max: 0.08, step: 0.001, decimals: 3 },
      ],
    },
    {
      group: "Wave",
      controls: [
        { key: "waveMode", label: "Wave", type: "select", options: WAVES },
        { key: "phaseStep", label: "Phase step Δφ (placeholder)", type: "range", min: 0, max: 90, step: 0.5, format: degFmt },
        { key: "maxTilt", label: "Max speed tilt θmax (placeholder)", type: "range", min: 0, max: 60, step: 1, format: degFmt },
        { key: "rollAmount", label: "Roll wobble", type: "range", min: 0, max: 0.3, step: 0.005, decimals: 3 },
      ],
    },
    {
      group: "Motion",
      controls: [
        { key: "scrollSensitivity", label: "Scroll sensitivity", type: "range", min: 0.02, max: 3, step: 0.05 },
        { key: "lerpDamping", label: "Inertia (λ)", type: "range", min: 0.01, max: 0.3, step: 0.005, decimals: 3 },
        { key: "scrollDirection", label: "Direction", type: "select", options: [["forward", "Forward"], ["reverse", "Reverse"]] },
      ],
    },
    {
      group: "Camera",
      controls: [
        { key: "cameraType", label: "Camera", type: "select", options: [["perspective", "Perspective"], ["orthographic", "Orthographic"]] },
        { key: "fov", label: "Lens (field of view)", type: "range", min: 15, max: 90, step: 1, format: degFmt },
        { key: "fitMode", label: "Fit to", type: "select", options: [["row", "Whole row"], ["height", "Height (row bleeds off the sides)"]] },
        { key: "fill", label: "Fill the window", type: "range", min: 0.4, max: 2.5, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
        { key: "cameraDistance", label: "Zoom", type: "range", min: 0.5, max: 3, step: 0.01, format: (v) => `${v.toFixed(2)}×` },
      ],
    },
    {
      group: "Look",
      controls: [
        { key: "shading", label: "Shading", type: "select", options: [["lit", "Lit 3D"], ["matte", "Matte"], ["flat", "Flat (no shading)"]] },
        { key: "ringColor", label: "Ring colour", type: "swatch", lead: [["theme", "Theme accent"]] },
        { key: "wireframe", label: "Wireframe", type: "toggle" },
      ],
    },
  ],
  telemetry: [
    { key: "wave", label: "Wave" },
    { key: "orbit", label: "Θ", extra: true },
    { key: "vel", label: "Velocity", extra: true },
    { key: "tilt", label: "Tilt", extra: true },
    { key: "fps", label: "FPS" },
  ],
  onChange: (c, key) => apply(key),
  onReset: () => (scroll.target = 0),
  onStep: (dir) => (scroll.target += rad(lab.config.phaseStep || 15) * dir),
  onScrub: (f) => (scroll.target = Math.floor(orbit / (Math.PI * 2)) * Math.PI * 2 + f * Math.PI * 2),
});

const scroll = virtualScroll(stageEl);
let orbit = 0;

function rebuild() {
  const c = lab.config;
  geometry?.dispose();
  geometry = S.ringGeometry(c.geometry, c.ringRadius, c.tubeThickness);
  for (const r of rings) row.remove(r);
  rings = Array.from({ length: c.ringCount }, () => {
    const m = new THREE.Mesh(geometry, S.material);
    row.add(m);
    return m;
  });
}

function apply(key) {
  const c = lab.config;
  if (key == null || ["ringCount", "ringRadius", "tubeThickness", "geometry"].includes(key)) rebuild();
  if (key == null || key === "theme" || key === "ringColor") S.applyTheme(c.ringColor);
  S.setShading(c.shading, rings, c.wireframe);
  scroll.sensitivity = c.scrollSensitivity;
  scroll.direction = c.scrollDirection === "reverse" ? -1 : 1;
  if (key == null || key === "cameraType") S.useCamera(c.cameraType);
  if (key == null || REFIT.includes(key)) refit();
}

/** Fit the camera so the row (rings face-on, their widest) fills the window. */
function refit() {
  const c = lab.config;
  const n = c.ringCount;
  const half = (n - 1) / 2;
  const pts = [];
  // Whole row: every ring in frame. Height: the middle ring fills the height and the row runs off both sides.
  const which = c.fitMode === "height" ? [Math.round(half)] : Array.from({ length: n }, (_, i) => i);
  for (const i of which) pts.push(...ringOutline(THREE, new THREE.Vector3((i - half) * c.spacing, 0, 0), c.ringRadius * 1.05));
  S.setFov(c.fov);
  S.fit(pts, { fill: c.fill, zoom: c.cameraDistance });
}
const REFIT = ["fitMode", "ringCount", "spacing", "ringRadius", "fov", "fill", "cameraDistance", "cameraType"];
S.onResize(refit);

function frame(dt, fps) {
  const c = lab.config;
  if (lab.auto) scroll.target += dt * 0.6 * scroll.direction;
  const prev = orbit;
  orbit = damp(orbit, scroll.target, c.lerpDamping, dt);
  const v = (orbit - prev) * (dt > 0 ? 1 / 60 / dt : 1); // per-60fps-frame velocity, as the formula assumes
  const n = rings.length;
  const centre = (n - 1) / 2;
  const dphi = rad(c.phaseStep);
  const tmax = rad(c.maxTilt);
  const tilt = clamp(v * 15 * tmax, -tmax, tmax);

  for (let i = 0; i < n; i++) {
    const r = rings[i];
    const off = i - centre;
    r.position.set(off * c.spacing, 0, 0);
    let y;
    if (c.waveMode === "conveyor") y = orbit + i * dphi;
    else if (c.waveMode === "lockstep") y = orbit;
    else if (c.waveMode === "counter") y = orbit * (i % 2 ? -1 : 1) + i * dphi;
    else y = orbit + Math.PI / 2 - Math.abs(off) * dphi;
    r.rotation.set(tilt * (centre ? off / centre : 0), y, Math.sin(orbit + off * 0.3) * c.rollAmount, "YXZ");
  }

  S.placeCamera();
  S.render();

  lab.track((((orbit % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2));
  lab.telemetry({
    wave: SHORT[c.waveMode] ?? "",
    orbit: `${deg(orbit).toFixed(1)}°`,
    vel: `${deg(v).toFixed(2)}°/f`,
    tilt: `${deg(tilt).toFixed(1)}°`,
    fps: String(Math.round(fps)),
  });
}

apply(null);
loop(frame);
