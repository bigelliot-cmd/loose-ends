// Loose Ends · Web animations — shared motion maths. Plain functions, no Three.js,
// so the SVG and video modules use the same inertia and input as the 3D ones.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

/**
 * Exponential smoothing, frame-rate independent: `lambda` is the
 * per-frame factor at 60 fps (S += (target − S)·λ), corrected for the real
 * frame time so a 120 Hz screen feels the same as a 60 Hz one.
 */
export function damp(current, target, lambda, dtSeconds) {
  const t = 1 - Math.pow(1 - lambda, dtSeconds * 60);
  return current + (target - current) * t;
}

/** Spring-damper: a = (target − x)·k; v = (v + a)·μ; x += v. One step per 60 fps frame. */
export function springStep(state, target, k = 0.08, mu = 0.82) {
  const a = (target - state.x) * k;
  state.v = (state.v + a) * mu;
  state.x += state.v;
  return state;
}

/** Cursor offset from the centre of `el`, each axis clamped to [−1, 1]. */
export function trackCursor(el) {
  const cursor = { x: 0, y: 0, active: false };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    cursor.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
    cursor.y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
    cursor.active = true;
  };
  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", () => {
    cursor.x = 0;
    cursor.y = 0;
    cursor.active = false;
  });
  return cursor;
}

/**
 * A virtual scroll value fed by wheel, drag and touch on `el` — not the
 * page's own scroll, so it can run forever in both directions (needed for
 * the looping modules). Wheel: ΔS = ΔY·wheelScale·sens. Drag:
 * ΔS = (ΔX − ΔY)·0.005·sens. `target` is where input says we should be;
 * modules ease toward it.
 */
export function virtualScroll(el, { wheelScale = 0.0015, dragScale = 0.005 } = {}) {
  const s = { target: 0, sensitivity: 1, direction: 1, enabled: true };
  el.addEventListener(
    "wheel",
    (e) => {
      if (!s.enabled) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      s.target += dy * wheelScale * s.sensitivity * s.direction;
    },
    { passive: false }
  );
  let last = null;
  el.addEventListener("pointerdown", (e) => {
    if (!s.enabled) return;
    last = { x: e.clientX, y: e.clientY };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    s.target += (dx - dy) * dragScale * s.sensitivity * s.direction;
  });
  const end = () => (last = null);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  return s;
}

/** requestAnimationFrame loop with dt (seconds) and a rolling FPS figure; pauses while the tab is hidden. */
export function loop(frame) {
  let last = performance.now();
  let fps = 60;
  let id = 0;
  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (dt > 0) fps = lerp(fps, 1 / dt, 0.05);
    frame(dt, fps);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(id);
    else {
      last = performance.now();
      id = requestAnimationFrame(tick);
    }
  });
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
