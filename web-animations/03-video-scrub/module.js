// 03 Scroll Video Scrubber.
//
//   p_target = scroll / h_virtual            (virtual scroll: wheel + drag, unbounded)
//   p_t      = p + (p_target − p)·λ          (λ = 0.12, frame-rate corrected)
//   wrapped  = ((p mod 1) + 1) mod 1         (looping; off = clamp to 0…1)
//   frame    = round(wrapped · N) mod N,  N = duration · fps
//
// On purpose, it seeks to the *middle* of the
// frame, (frame + 0.5)/fps, not p·duration. Landing exactly on a frame
// boundary can show the frame before it; the middle can't be ambiguous.
// It also seeks only once the last seek has landed, so the decoder isn't
// flooded, and reads back the frame actually shown
// (requestVideoFrameCallback) so "Frame" and "Shown" can be compared.
//
// Frame accuracy also depends on how the video is encoded: with few
// keyframes, seeks are slow and land late. For the real clip, re-encode
// with every frame (or nearly) as a keyframe.
import { createLab } from "../shell/lab.js";
import { clamp, damp, loop, prefersReducedMotion, virtualScroll } from "../shell/motion.js";

const defaults = await (await fetch("./config.json")).json();
const stage = document.getElementById("stage");
const video = document.getElementById("video");
const canvas = document.getElementById("pattern");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("file");
const usePattern = document.getElementById("usePattern");
const sourceName = document.getElementById("sourceName");

const lab = createLab({
  module: "03-scroll-video-scrub",
  number: "03",
  title: "Video Scrub",
  defaults,
  presets: [
    { label: "Smooth", values: { lerpDamping: 0.12, wrap: true } },
    { label: "Snappy", values: { lerpDamping: 0.3, wrap: true } },
    { label: "Heavy", values: { lerpDamping: 0.04, wrap: true } },
    { label: "No loop", values: { lerpDamping: 0.12, wrap: false } },
  ],
  schema: [
    {
      group: "Source",
      controls: [
        { key: "fps", label: "Frame rate (from the file)", type: "range", min: 12, max: 120, step: 1, decimals: 0, unit: " fps" },
        { key: "patternFrames", label: "Test pattern frames", type: "range", min: 24, max: 600, step: 1, decimals: 0 },
        { key: "fit", label: "Fit", type: "select", options: [["contain", "Contain"], ["cover", "Cover"]] },
      ],
    },
    {
      group: "Scrub",
      controls: [
        { key: "virtualHeight", label: "Scroll per loop (h_virtual)", type: "range", min: 500, max: 10000, step: 50, decimals: 0, unit: " px" },
        { key: "lerpDamping", label: "Inertia (λ)", type: "range", min: 0.01, max: 0.5, step: 0.005, decimals: 3 },
        { key: "wrap", label: "Loop at the ends", type: "toggle" },
      ],
    },
  ],
  telemetry: [
    { key: "progress", label: "Progress" },
    { key: "time", label: "Time", extra: true },
    { key: "frame", label: "Frame" },
    { key: "shown", label: "Shown", extra: true },
    { key: "fps", label: "FPS" },
  ],
  onChange: (c, key) => apply(key),
  onReset: () => (scroll.target = 0),
  onStep: (dir) => (scroll.target += dir / totalFrames()),
  onScrub: (f) => (scroll.target = (lab.config.wrap ? Math.floor(p) : 0) + f),
});

const scroll = virtualScroll(stage, { wheelScale: 1 / 2500, dragScale: 1 / 1500 });
let p = 0;
let usingVideo = false;
let lastSeekFrame = -1;
let shownFrame = null;

const totalFrames = () => (usingVideo && video.duration ? Math.max(1, Math.round(video.duration * lab.config.fps)) : lab.config.patternFrames);

function apply() {
  const c = lab.config;
  scroll.sensitivity = 2500 / c.virtualHeight; // so h_virtual px of scroll = one pass
  stage.style.setProperty("--fit", c.fit);
  sizeCanvas();
}

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
window.addEventListener("resize", sizeCanvas);

// ---------- sources ----------
let objectUrl = null;
function loadFile(file) {
  if (!file || !file.type.startsWith("video/")) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file); // played locally, never uploaded
  video.src = objectUrl;
  sourceName.textContent = file.name;
  video.hidden = false;
  canvas.hidden = true;
  usePattern.hidden = false;
  usingVideo = true;
  lastSeekFrame = -1;
}
fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
usePattern.addEventListener("click", () => {
  usingVideo = false;
  video.hidden = true;
  video.removeAttribute("src");
  canvas.hidden = false;
  usePattern.hidden = true;
  sourceName.textContent = "Test pattern";
  sizeCanvas();
});
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
});
window.addEventListener("dragleave", (e) => e.relatedTarget == null && document.body.classList.remove("dragging"));
window.addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  loadFile(e.dataTransfer.files[0]);
});

// Read back which frame the browser actually painted.
function watchFrames() {
  if (!("requestVideoFrameCallback" in video)) return;
  const cb = (_now, meta) => {
    shownFrame = Math.round(meta.mediaTime * lab.config.fps);
    video.requestVideoFrameCallback(cb);
  };
  video.requestVideoFrameCallback(cb);
}
video.addEventListener("loadedmetadata", () => {
  shownFrame = null;
  watchFrames();
});

// ---------- test pattern: one unmistakable picture per frame ----------
function drawPattern(frame, n) {
  const w = canvas.width;
  const h = canvas.height;
  const css = getComputedStyle(document.body);
  const accent = css.getPropertyValue("--accent").trim() || "#3fbdac";
  ctx.fillStyle = css.getPropertyValue("--stage").trim() || "#000";
  ctx.fillRect(0, 0, w, h);
  const s = Math.min(w, h);
  // A row of rings turning one notch per frame (a nod to the torus-row reel).
  const count = 11;
  for (let i = 0; i < count; i++) {
    const a = (frame / n) * Math.PI * 2 + i * 0.35;
    const x = w / 2 + (i - (count - 1) / 2) * s * 0.075;
    ctx.beginPath();
    ctx.ellipse(x, h * 0.42, Math.abs(Math.cos(a)) * s * 0.06 + 1, s * 0.06, 0, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.5, s * 0.004);
    ctx.stroke();
  }
  // Frame number, big, and a tick per frame on a strip so a skipped frame shows.
  ctx.fillStyle = accent;
  ctx.font = `600 ${Math.round(s * 0.09)}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(String(frame).padStart(String(n - 1).length, "0"), w / 2, h * 0.72);
  ctx.font = `500 ${Math.round(s * 0.022)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`frame of ${n} · ${lab.config.fps} fps`, w / 2, h * 0.78);
  const stripW = w * 0.7;
  const x0 = (w - stripW) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x0, h * 0.86, stripW, 2);
  ctx.fillStyle = accent;
  ctx.fillRect(x0 + (frame / n) * stripW, h * 0.86 - 10, Math.max(2, stripW / n), 22);
}

// ---------- frame ----------
const timecode = (seconds, fps) => {
  const f = Math.floor(seconds * fps + 1e-6);
  const ff = f % fps;
  const ss = Math.floor(f / fps) % 60;
  const mm = Math.floor(f / fps / 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
};

function frame(dt, fps) {
  const c = lab.config;
  const n = totalFrames();
  if (lab.auto) scroll.target += dt / (n / c.fps); // real-time playback
  if (!c.wrap) scroll.target = clamp(scroll.target, 0, 1);
  p = damp(p, scroll.target, c.lerpDamping, dt);
  const wrapped = c.wrap ? ((p % 1) + 1) % 1 : clamp(p, 0, 1);
  const idx = Math.round(wrapped * n) % n;

  if (usingVideo) {
    if (video.readyState >= 1 && !video.seeking && idx !== lastSeekFrame) {
      video.currentTime = Math.min(video.duration - 0.001, (idx + 0.5) / c.fps);
      lastSeekFrame = idx;
    }
  } else {
    drawPattern(idx, n);
    shownFrame = idx;
  }

  lab.track(wrapped);
  lab.telemetry({
    progress: `${(wrapped * 100).toFixed(1)}%`,
    time: timecode(idx / c.fps, c.fps),
    frame: `${idx} / ${n}`,
    shown: shownFrame == null ? "—" : String(shownFrame),
    fps: String(Math.round(fps)),
  });
}

apply();
if (prefersReducedMotion()) lab.config.lerpDamping = Math.max(lab.config.lerpDamping, 0.3);
loop(frame);
