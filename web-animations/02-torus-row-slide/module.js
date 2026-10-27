// 02 Torus Row Slide (15-circle progressive slide wave).
//
// 15 rings, i ∈ [−7, +7]. At rest the left end is face-on (0°), the centre
// edge-on (90°) and the right end face-on again (180°):
//   Δφ   = (π/2) / 7                        (here (π/2)/half, so any odd count keeps that pose)
//   θY_i = Θscroll + π/2 + i·Δφ·dir
//   θX_i = clamp(±θmax, v·15·θmax)·(i/7)   (speed tips the ends, not the centre)
// `dir` is read here as which way the ramp runs (±1).
// Ring size, spacing and θmax are starting values.
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
const degFmt = (v) => `${Math.round(v)}°`;

const lab = createLab({
  module: "02-torus-row-slide",
  number: "02",
  title: "Torus Row Slide",
  defaults,
  presets: [
    { label: "Slide", values: { phaseDirection: 1, ringRadius: 0.21, cameraType: "perspective" } },
    { label: "Reversed", values: { phaseDirection: -1, ringRadius: 0.21, cameraType: "perspective" } },
    { label: "Overlap", values: { phaseDirection: 1, ringRadius: 0.4, cameraType: "perspective" } },
    { label: "Flat", values: { phaseDirection: 1, ringRadius: 0.21, cameraType: "orthographic" } },
  ],
  schema: [
    {
      group: "Row",
      controls: [
        { key: "ringCount", label: "Rings (odd)", type: "range", min: 5, max: 31, step: 2, decimals: 0 },
        { key: "spacing", label: "Spacing (placeholder)", type: "range", min: 0.15, max: 1.2, step: 0.01 },
        { key: "ringRadius", label: "Ring radius (placeholder)", type: "range", min: 0.05, max: 2, step: 0.01 },
        { key: "tubeThickness", label: "Tube thickness", type: "range", min: 0.002, max: 0.06, step: 0.001, decimals: 3 },
      ],
    },
    {
      group: "Wave",
      controls: [
        { key: "phaseDirection", label: "Ramp direction (dir)", type: "select", options: [["1", "Flat → edge → flat (left to right)"], ["-1", "Mirrored"]] },
        { key: "maxTilt", label: "Max speed tilt θmax (placeholder)", type: "range", min: 0, max: 60, step: 1, format: degFmt },
      ],
    },
    {
      group: "Motion",
      controls: [
        { key: "scrollSensitivity", label: "Scroll sensitivity", type: "range", min: 0.02, max: 3, step: 0.05 },
        { key: "lerpDamping", label: "Inertia (λ)", type: "range", min: 0.01, max: 0.3, step: 0.005, decimals: 3 },
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
    { key: "scroll", label: "Θscroll" },
    { key: "centre", label: "Centre ring", extra: true },
    { key: "vel", label: "Velocity", extra: true },
    { key: "fps", label: "FPS" },
  ],
  onChange: (c, key) => apply(key),
  onReset: () => (scroll.target = 0),
  onStep: (dir) => (scroll.target += (Math.PI / 2 / ((lab.config.ringCount - 1) / 2)) * dir),
  onScrub: (f) => (scroll.target = Math.floor(pos / Math.PI) * Math.PI + f * Math.PI),
});

const scroll = virtualScroll(stageEl);
let pos = 0;

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
  if (typeof c.phaseDirection === "string") c.phaseDirection = Number(c.phaseDirection); // selects hand back strings
  if (key == null || ["ringCount", "ringRadius", "tubeThickness", "geometry"].includes(key)) rebuild();
  if (key == null || key === "theme" || key === "ringColor") S.applyTheme(c.ringColor);
  S.setShading(c.shading, rings, c.wireframe);
  scroll.sensitivity = c.scrollSensitivity;
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
  if (lab.auto) scroll.target += dt * 0.5;
  const prev = pos;
  pos = damp(pos, scroll.target, c.lerpDamping, dt);
  const v = (pos - prev) * (dt > 0 ? 1 / 60 / dt : 1);
  const n = rings.length;
  const half = (n - 1) / 2;
  const dphi = Math.PI / 2 / half;
  const tmax = rad(c.maxTilt);
  const tilt = clamp(v * 15 * tmax, -tmax, tmax);
  const dir = Number(c.phaseDirection) || 1;

  for (let k = 0; k < n; k++) {
    const i = k - half;
    const r = rings[k];
    r.position.set(i * c.spacing, 0, 0);
    r.rotation.set(tilt * (i / half), pos + Math.PI / 2 + i * dphi * dir, 0, "YXZ");
  }

  S.placeCamera();
  S.render();

  lab.track((((pos % Math.PI) + Math.PI) % Math.PI) / Math.PI);
  const centreAngle = ((deg(pos + Math.PI / 2) % 180) + 180) % 180;
  lab.telemetry({
    scroll: `${deg(pos).toFixed(1)}°`,
    centre: `${centreAngle.toFixed(1)}°`,
    vel: `${deg(v).toFixed(2)}°/f`,
    fps: String(Math.round(fps)),
  });
}

apply(null);
loop(frame);
