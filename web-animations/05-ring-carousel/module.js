// 05 Torus Ring Carousel.
//
// N rings on a circle of radius R, standing upright with their edges
// pointing at the centre. Each ring k sits at θk = 2πk/N + Θorbit:
//   position  (R cos θk, 0, R sin θk)
//   rotation  order YXZ, y = −θk  → the ring's axis lies along the circle's
//             tangent, so its edge faces the origin; x = Θorbit·ratio when
//             self-roll is on.
// An X-flip (αX) rotates positions only; here the rings live in a
// group and the group turns, so the rings tilt with the circle as well.
//
// Camera (Elliot, 2026-10-24): standing tall is viewed at eye height (an
// elevated view is ≈ 14° on the Camera height control), with
// a wider 50° lens for real perspective, and the camera distance is fitted so
// the formation fills the window at any size. "Zoom" (the classic
// cameraDistance) goes past the fit.
//
// Back-half fade (Module 06, "Ring Arc", same code, its own config): fog in
// the stage colour starts at the carousel's centre line and swallows the far
// side, so only the front arc shows; the camera then frames just that arc,
// which makes the rings much bigger. Which card this page is comes from the
// <body data-module/number/title> attributes.
import { createLab } from "../shell/lab.js";
import { createRingStage, ringOutline } from "../shell/ring-stage.js";
import { damp, deg, loop, prefersReducedMotion, rad, trackCursor, virtualScroll } from "../shell/motion.js";

const defaults = await (await fetch("./config.json")).json();
const TAU = Math.PI * 2;
const stageEl = document.getElementById("stage");
const S = createRingStage(stageEl, { fov: defaults.fov });
const { THREE } = S;
const assembly = new THREE.Group(); // flip and tilt
S.scene.add(assembly);
let geometry = null;
let rings = [];

const degFmt = (v) => `${Math.round(v)}°`;
const page = document.body.dataset;
const lab = createLab({
  module: page.module ?? "05-torus-ring-carousel",
  number: page.number ?? "05",
  title: page.title ?? "Ring Carousel",
  defaults,
  presets: [
    { label: "Standing tall", values: { flipAngleX: 0, cameraHeight: 0, ringSelfSpin: false, ringFacingMode: "radial" } },
    { label: "Facing viewer", values: { flipAngleX: 90, cameraHeight: 0, ringSelfSpin: false, ringFacingMode: "radial" } },
    { label: "Three-quarter", values: { flipAngleX: 0, cameraHeight: 30, ringSelfSpin: false, ringFacingMode: "radial" } },
    { label: "Self-roll", values: { flipAngleX: 0, cameraHeight: 0, ringSelfSpin: true, selfSpinRatio: 2 } },
  ],
  schema: [
    {
      group: "Formation",
      controls: [
        { key: "ringCount", label: "Rings", type: "range", min: 3, max: 36, step: 1, decimals: 0 },
        { key: "carouselRadius", label: "Carousel radius", type: "range", min: 0.5, max: 4, step: 0.05 },
        { key: "ringRadius", label: "Ring radius", type: "range", min: 0.1, max: 3, step: 0.01 },
        { key: "tubeThickness", label: "Tube thickness", type: "range", min: 0.004, max: 0.1, step: 0.001, decimals: 3 },
      ],
    },
    {
      group: "Orientation",
      controls: [
        { key: "flipAngleX", label: "X flip", type: "range", min: 0, max: 180, step: 1, format: degFmt },
        { key: "tiltY", label: "Tilt Y", type: "range", min: -90, max: 90, step: 1, format: degFmt },
        { key: "tiltZ", label: "Tilt Z", type: "range", min: -90, max: 90, step: 1, format: degFmt },
        { key: "ringFacingMode", label: "Ring facing", type: "select", options: [["radial", "Radial (edges to centre)"], ["tangent", "Faces the centre"], ["parallel", "All parallel"]] },
      ],
    },
    {
      group: "Motion",
      controls: [
        { key: "scrollSensitivity", label: "Scroll sensitivity", type: "range", min: 0.02, max: 3, step: 0.05 },
        { key: "lerpDamping", label: "Inertia (λ)", type: "range", min: 0.01, max: 0.3, step: 0.005, decimals: 3 },
        { key: "scrollDirection", label: "Direction", type: "select", options: [["clockwise", "Clockwise"], ["counterclockwise", "Counter-clockwise"]] },
        { key: "ringSelfSpin", label: "Ring self-roll", type: "toggle" },
        { key: "selfSpinRatio", label: "Self-roll ratio", type: "range", min: 0.25, max: 6, step: 0.25 },
      ],
    },
    {
      group: "Camera",
      controls: [
        { key: "cameraType", label: "Camera", type: "select", options: [["perspective", "Perspective"], ["orthographic", "Orthographic"]] },
        { key: "cameraHeight", label: "Camera height (0° = eye level)", type: "range", min: -30, max: 89, step: 1, format: degFmt },
        { key: "fov", label: "Lens (field of view)", type: "range", min: 15, max: 90, step: 1, format: degFmt },
        { key: "fill", label: "Fill the window", type: "range", min: 0.4, max: 2.5, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
        { key: "cameraDistance", label: "Zoom", type: "range", min: 0.5, max: 3, step: 0.01, format: (v) => `${v.toFixed(2)}×` },
        { key: "mouseParallax", label: "Mouse parallax", type: "toggle" },
      ],
    },
    ...("backFade" in defaults
      ? [
          {
            group: "Back-half fade",
            controls: [
              { key: "backFade", label: "Fade the back half", type: "toggle" },
              { key: "fadeStart", label: "Fade starts (0 = centre line)", type: "range", min: -1, max: 1, step: 0.01, format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)} R` },
              { key: "fadeLength", label: "Fade length", type: "range", min: 0.05, max: 2, step: 0.01, format: (v) => `${v.toFixed(2)} R` },
              { key: "frameFrontOnly", label: "Frame the front arc only", type: "toggle" },
            ],
          },
        ]
      : []),
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
    { key: "orbit", label: "Orbit" },
    { key: "vel", label: "Velocity", extra: true },
    { key: "rings", label: "Rings", extra: true },
    { key: "cam", label: "Camera", extra: true },
    { key: "fps", label: "FPS" },
  ],
  onChange: (cfg, key) => apply(key),
  onReset: () => (scroll.target = 0),
  onStep: (dir) => (scroll.target += (TAU / lab.config.ringCount) * dir),
  onScrub: (f) => (scroll.target = Math.floor(orbit / TAU) * TAU + f * TAU),
});

const scroll = virtualScroll(stageEl);
const cursor = trackCursor(stageEl);
let orbit = 0;
const parallax = { x: 0, y: 0 };

function rebuildGeometry() {
  const c = lab.config;
  geometry?.dispose();
  geometry = S.ringGeometry(c.geometry, c.ringRadius, c.tubeThickness);
  for (const r of rings) r.geometry = geometry;
}

function rebuildRings() {
  for (const r of rings) assembly.remove(r);
  rings = Array.from({ length: lab.config.ringCount }, () => {
    const m = new THREE.Mesh(geometry, S.material);
    m.rotation.order = "YXZ";
    assembly.add(m);
    return m;
  });
}

/** Fit the camera to the formation as it stands (flip, tilt, ring size), from the chosen height. */
function refit() {
  const c = lab.config;
  assembly.rotation.set(rad(c.flipAngleX), rad(c.tiltY), rad(c.tiltZ), "XYZ");
  assembly.updateMatrixWorld();
  const pts = [];
  const n = c.ringCount;
  const frontOnly = c.backFade && c.frameFrontOnly;
  for (let k = 0; k < n; k++) {
    const t = (TAU * k) / n;
    if (frontOnly && Math.sin(t) < (c.fadeStart ?? 0) - 0.15) continue; // behind where the fade starts: not framed
    const centre = new THREE.Vector3(c.carouselRadius * Math.cos(t), 0, c.carouselRadius * Math.sin(t));
    const radial = new THREE.Vector3(Math.cos(t), 0, Math.sin(t));
    const tangent = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t));
    const up = new THREE.Vector3(0, 1, 0);
    // Both the ring's own plane and the one it rolls into, so self-roll and facing modes stay in frame.
    for (const p of [...ringOutline(THREE, centre, c.ringRadius, radial, up, 8), ...ringOutline(THREE, centre, c.ringRadius, tangent, up, 8)]) pts.push(p.applyMatrix4(assembly.matrixWorld));
  }
  const e = rad(c.cameraHeight);
  S.setFov(c.fov);
  const target = new THREE.Vector3();
  if (frontOnly) {
    for (const p of pts) target.add(p);
    target.divideScalar(pts.length || 1);
  }
  fitDistance = S.fit(pts, { dir: new THREE.Vector3(0, Math.sin(e), Math.cos(e)), target, fill: c.fill, zoom: c.cameraDistance });
  centreDepth = fitDistance + target.clone().sub(new THREE.Vector3()).dot(new THREE.Vector3(0, Math.sin(e), Math.cos(e)));
  applyFade();
}

/** Fog in the stage colour from the centre line back, so the far half dissolves into the background. */
let fitDistance = 8;
let centreDepth = 8; // camera → carousel centre, along the view
function applyFade() {
  const c = lab.config;
  if (!c.backFade) {
    S.scene.fog = null;
    return;
  }
  const stageColour = getComputedStyle(document.body).getPropertyValue("--stage").trim() || "#000";
  const near = centreDepth - (c.fadeStart ?? 0) * c.carouselRadius;
  const far = near + Math.max(0.05, c.fadeLength ?? 0.6) * c.carouselRadius;
  if (!S.scene.fog) S.scene.fog = new THREE.Fog(stageColour, near, far);
  S.scene.fog.color.set(stageColour);
  S.scene.fog.near = near;
  S.scene.fog.far = far;
}

const REFIT = ["backFade", "fadeStart", "fadeLength", "frameFrontOnly", "ringCount", "carouselRadius", "ringRadius", "flipAngleX", "tiltY", "tiltZ", "cameraHeight", "fov", "fill", "cameraDistance", "cameraType"];
function apply(key) {
  const c = lab.config;
  if (key == null || ["ringRadius", "tubeThickness", "geometry"].includes(key)) rebuildGeometry();
  if (key == null || key === "ringCount") rebuildRings();
  if (key == null || key === "theme" || key === "ringColor") {
    S.applyTheme(c.ringColor);
    applyFade(); // fog follows the theme's stage colour
  }
  S.setShading(c.shading, rings, c.wireframe);
  scroll.sensitivity = c.scrollSensitivity;
  scroll.direction = c.scrollDirection === "clockwise" ? 1 : -1;
  if (key == null || key === "cameraType") S.useCamera(c.cameraType);
  if (key == null || REFIT.includes(key)) refit();
}
S.onResize(refit);

function frame(dt, fps) {
  const c = lab.config;
  if (lab.auto) scroll.target += dt * 0.35 * scroll.direction; // auto-orbit, ~20°/s
  const prev = orbit;
  orbit = damp(orbit, scroll.target, c.lerpDamping, dt);
  const velocity = orbit - prev;

  assembly.rotation.set(rad(c.flipAngleX), rad(c.tiltY), rad(c.tiltZ), "XYZ");
  const n = rings.length;
  for (let k = 0; k < n; k++) {
    const theta = (TAU * k) / n + orbit;
    const ring = rings[k];
    ring.position.set(c.carouselRadius * Math.cos(theta), 0, c.carouselRadius * Math.sin(theta));
    ring.rotation.y = c.ringFacingMode === "parallel" ? 0 : c.ringFacingMode === "tangent" ? -theta + Math.PI / 2 : -theta;
    ring.rotation.x = c.ringSelfSpin ? orbit * c.selfSpinRatio : 0;
  }

  const want = c.mouseParallax && cursor.active ? { x: cursor.x * 0.06, y: -cursor.y * 0.04 } : { x: 0, y: 0 };
  parallax.x = damp(parallax.x, want.x, 0.06, dt);
  parallax.y = damp(parallax.y, want.y, 0.06, dt);
  S.placeCamera(parallax.x, parallax.y);
  S.render();

  const wrapped = ((orbit % TAU) + TAU) % TAU;
  lab.track(wrapped / TAU);
  lab.telemetry({
    orbit: `${deg(wrapped).toFixed(1)}°`,
    vel: `${deg(velocity).toFixed(2)}°/f`,
    rings: String(n),
    cam: `${Math.round(c.cameraHeight)}° · ${Math.round(c.fov)}°`,
    fps: String(Math.round(fps)),
  });
}

rebuildGeometry();
apply(null);
if (prefersReducedMotion()) lab.config.lerpDamping = Math.max(lab.config.lerpDamping, 0.2);
loop(frame);
