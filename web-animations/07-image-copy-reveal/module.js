// 07 Image + copy reveal: an image and a block of copy arrive in two stages.
// Type and colour follow Loose Ends (Inter Tight headings, Inter body).
//
// Built on the Web Animations API: every element gets one animation on a
// shared timeline (delays set the order), so the whole reveal can play,
// pause at any millisecond, scrub from the footer track, or follow scroll.
//
// Controls: per stage (image, copy) the effect, where it comes from, how
// far, how long and the easing; the order of the two stages and the gap or
// overlap between them; how the copy is split (block / elements / lines /
// words) and its stagger; and what starts it (page load, scrolled into
// view, or scroll-scrubbed).
import { createLab } from "../shell/lab.js";
import { clamp, damp, loop, prefersReducedMotion } from "../shell/motion.js";

const defaults = await (await fetch("./config.json")).json();
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const comp = $("comp");
const media = $("media");
const img = $("img");
const copyEl = $("copy");
const parts = { headline: $("headline"), subheadline: $("subheadline"), body: $("body") };

const EASING = {
  expo: "cubic-bezier(0.16, 1, 0.3, 1)", // the lab's own ease (matches the HUD)
  out: "cubic-bezier(0.33, 1, 0.68, 1)",
  inout: "cubic-bezier(0.65, 0, 0.35, 1)",
  back: "cubic-bezier(0.34, 1.56, 0.64, 1)", // a little overshoot
  linear: "linear",
};
const EASE_OPTIONS = [["expo", "Expo out (soft landing)"], ["out", "Ease out"], ["inout", "Ease in-out"], ["back", "Back out (slight overshoot)"], ["linear", "Linear"]];
const FROM_OPTIONS = [["below", "From below (rises)"], ["above", "From above"], ["left", "From the left"], ["right", "From the right"], ["none", "In place"]];
const EFFECTS = [["fade", "Fade"], ["slide", "Fade + slide"], ["scale", "Fade + scale"], ["blur", "Fade + blur"], ["wipe", "Wipe (mask)"]];
const ms = (v) => `${Math.round(v)} ms`;

const lab = createLab({
  module: "07-image-copy-reveal",
  number: "07",
  title: "Image + Copy Reveal",
  defaults,
  presets: [
    { label: "Image, then copy", values: { order: "image-first", copySplit: "elements", copyEffect: "slide", copyFrom: "below", imageEffect: "slide", imageFrom: "left" } },
    { label: "Together", values: { order: "together", copySplit: "elements", copyEffect: "fade", imageEffect: "scale", imageFrom: "none" } },
    { label: "Copy first", values: { order: "copy-first", copySplit: "lines", copyEffect: "slide", copyFrom: "below", imageEffect: "circle", imageFrom: "none" } },
    { label: "Words rise", values: { order: "image-first", copySplit: "words", copyEffect: "blur", copyFrom: "below", copyStagger: 35, copyDistance: 18, imageEffect: "wipe", imageFrom: "left" } },
  ],
  schema: [
    {
      group: "Sequence",
      controls: [
        { key: "order", label: "Order", type: "select", options: [["image-first", "Image, then copy"], ["copy-first", "Copy, then image"], ["together", "Together"]] },
        { key: "startDelay", label: "Start delay (a beat before it starts)", type: "range", min: 0, max: 3000, step: 50, format: ms },
        { key: "gap", label: "Gap between stages (− overlaps)", type: "range", min: -1500, max: 1500, step: 10, format: ms },
        { key: "trigger", label: "Starts", type: "select", options: [["load", "On page load"], ["view", "When scrolled into view"], ["scroll", "Scroll-scrubbed (follows scroll)"]] },
        { key: "viewPoint", label: "Trigger point (into view): middle reaches", type: "range", min: 10, max: 90, step: 1, format: (v) => `${v}% down the screen` },
        { key: "scrollHold", label: "Scroll hold (into view)", type: "range", min: 0, max: 5000, step: 100, format: ms },
        { key: "loopHold", label: "Loop hold (Space)", type: "range", min: 0, max: 6000, step: 100, format: ms },
      ],
    },
    {
      group: "Image",
      controls: [
        { key: "imageEffect", label: "Effect", type: "select", options: [...EFFECTS, ["circle", "Iris (circle grows)"]] },
        { key: "imageFrom", label: "From", type: "select", options: FROM_OPTIONS },
        { key: "imageDistance", label: "Distance", type: "range", min: 0, max: 400, step: 2, decimals: 0, unit: " px" },
        { key: "imageDuration", label: "Duration", type: "range", min: 100, max: 4000, step: 25, format: ms },
        { key: "imageEasing", label: "Easing", type: "select", options: EASE_OPTIONS },
        { key: "kenBurns", label: "Slow push-in on the image", type: "toggle" },
      ],
    },
    {
      group: "Copy",
      controls: [
        { key: "copySplit", label: "Arrives as", type: "select", options: [["block", "One block"], ["elements", "Headline, sub, body"], ["lines", "Line by line"], ["words", "Word by word"]] },
        { key: "copyStagger", label: "Stagger", type: "range", min: 0, max: 600, step: 5, format: ms },
        { key: "copyEffect", label: "Effect", type: "select", options: EFFECTS },
        { key: "copyFrom", label: "From", type: "select", options: FROM_OPTIONS },
        { key: "copyDistance", label: "Distance", type: "range", min: 0, max: 200, step: 1, decimals: 0, unit: " px" },
        { key: "copyDuration", label: "Duration", type: "range", min: 100, max: 3000, step: 25, format: ms },
        { key: "copyEasing", label: "Easing", type: "select", options: EASE_OPTIONS },
      ],
    },
    {
      group: "Layout",
      controls: [
        { key: "layout", label: "Layout", type: "select", options: [["image-left", "Image left"], ["image-right", "Image right"], ["stacked", "Stacked"]] },
        { key: "surface", label: "Surface", type: "select", options: [["white", "White"], ["grey", "Line grey"], ["navy", "Navy"]] },
        { key: "imageShape", label: "Image shape", type: "select", options: [["circle", "Circle"], ["rounded", "Rounded"], ["square", "Square"]] },
        { key: "imageSize", label: "Image share of width", type: "range", min: 15, max: 65, step: 1, decimals: 0, unit: "%" },
      ],
    },
    {
      group: "Content",
      controls: [
        { key: "headline", label: "Headline", type: "text", rows: 2 },
        { key: "subheadline", label: "Subheadline", type: "text" },
        { key: "body", label: "Body", type: "text", rows: 4 },
      ],
    },
  ],
  telemetry: [
    { key: "time", label: "Time" },
    { key: "stage", label: "Stage", extra: true },
    { key: "fps", label: "FPS" },
  ],
  notes: "./notes.html",
  onChange: () => scheduleRebuild(),
  onReset: () => play(),
  onAuto: (on) => on && play(),
  onStep: (dir) => seek(t + dir * 100),
  onScrub: (f) => seek(f * total),
});

// ---------- the timeline ----------
let anims = []; // { a: Animation, stage: "image" | "copy", start, end }
let total = 1;
let t = 0;
let playing = false;
let playStart = 0;
let finishedAt = 0;

function words(el, text) {
  el.replaceChildren();
  const out = [];
  text.split(/(\s+)/).forEach((chunk) => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) el.append(chunk);
    else {
      const w = document.createElement("span");
      w.className = "w";
      w.textContent = chunk;
      el.append(w);
      out.push(w);
    }
  });
  return out;
}

function offset(from, d) {
  return { below: `translate(0, ${d}px)`, above: `translate(0, ${-d}px)`, left: `translate(${-d}px, 0)`, right: `translate(${d}px, 0)`, none: "translate(0, 0)" }[from] ?? "translate(0, 0)";
}
function wipe(from) {
  return { left: "inset(0 100% 0 0)", right: "inset(0 0 0 100%)", below: "inset(100% 0 0 0)", above: "inset(0 0 100% 0)", none: "inset(50% 50% 50% 50%)" }[from];
}
function keyframes(effect, from, d) {
  switch (effect) {
    case "fade":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "scale":
      return [{ opacity: 0, transform: `${offset(from, d)} scale(0.9)` }, { opacity: 1, transform: "translate(0, 0) scale(1)" }];
    case "blur":
      return [{ opacity: 0, transform: offset(from, d), filter: "blur(14px)" }, { opacity: 1, transform: "translate(0, 0)", filter: "blur(0px)" }];
    case "wipe":
      return [{ clipPath: wipe(from), transform: offset(from, d * 0.25) }, { clipPath: "inset(0 0 0 0)", transform: "translate(0, 0)" }];
    case "circle":
      return [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }];
    default: // slide
      return [{ opacity: 0, transform: offset(from, d) }, { opacity: 1, transform: "translate(0, 0)" }];
  }
}

/** The copy's moving pieces, in reading order, each with its stagger slot. */
function copyTargets(split) {
  const c = lab.config;
  for (const [k, el] of Object.entries(parts)) el.textContent = c[k];
  if (split === "block") return [[copyEl]];
  if (split === "elements") return Object.values(parts).map((el) => [el]);
  const all = Object.entries(parts).map(([k, el]) => words(el, c[k]));
  if (split === "words") return all.flat().map((w) => [w]);
  // Lines: words grouped by where they wrapped (same top), per element.
  const lines = [];
  for (const ws of all) {
    let current = null;
    let top = null;
    for (const w of ws) {
      if (top === null || Math.abs(w.offsetTop - top) > 2) {
        current = [];
        lines.push(current);
        top = w.offsetTop;
      }
      current.push(w);
    }
  }
  return lines;
}

function build() {
  const c = lab.config;
  for (const { a } of anims) a.cancel();
  anims = [];

  // Layout and surface first, so line breaks are measured in the final layout.
  stage.className = `stage reveal surface-${c.surface} trigger-${c.trigger} layout-${c.layout} shape-${c.imageShape}`;
  comp.style.setProperty("--img-share", `${c.imageSize}%`);
  comp.classList.toggle("narrow", window.innerWidth < 768 && c.layout !== "stacked");

  const groups = copyTargets(c.copySplit);
  const copyLength = c.copyDuration + c.copyStagger * Math.max(0, groups.length - 1);
  // A beat before anything moves, then the two stages in order.
  const beat = c.startDelay ?? 0;
  let imageStart = beat;
  let copyStart = beat;
  if (c.order === "image-first") copyStart = beat + Math.max(0, c.imageDuration + c.gap);
  else if (c.order === "copy-first") imageStart = beat + Math.max(0, copyLength + c.gap);

  const reduced = prefersReducedMotion();
  const add = (el, frames, duration, delay, easing, stageName) => {
    const a = el.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : frames, { duration: reduced ? Math.min(duration, 200) : duration, delay, easing, fill: "both" });
    a.pause();
    anims.push({ a, stage: stageName, start: delay, end: delay + duration });
  };
  add(media, keyframes(c.imageEffect, c.imageFrom, c.imageDistance), c.imageDuration, imageStart, EASING[c.imageEasing], "Image");
  if (c.kenBurns && !reduced) add(img, [{ transform: "scale(1.12)" }, { transform: "scale(1)" }], c.imageDuration * 1.8, imageStart, "cubic-bezier(0.22, 1, 0.36, 1)", "Image");
  groups.forEach((group, i) => {
    for (const el of group) add(el, keyframes(c.copyEffect, c.copyFrom, c.copyDistance), c.copyDuration, copyStart + i * c.copyStagger, EASING[c.copyEasing], "Copy");
  });
  total = Math.max(1, ...anims.map((x) => x.end));
}

function seek(ms) {
  playing = false;
  t = clamp(ms, 0, total);
  for (const { a } of anims) {
    a.pause();
    a.currentTime = t;
  }
}
function play() {
  seek(0);
  playing = true;
  playStart = performance.now();
  for (const { a } of anims) a.play();
}

let rebuildTimer = 0;
let replayTimer = 0;
const REPLAY_AFTER_MS = 1200; // replaying on every tweak feels awkward; wait for a pause
function scheduleRebuild() {
  // While tuning: show the finished frame as you change things, and replay
  // once you've stopped for REPLAY_AFTER_MS.
  clearTimeout(rebuildTimer);
  clearTimeout(replayTimer);
  rebuildTimer = setTimeout(() => {
    build();
    if (lab.config.trigger !== "scroll") seek(total);
  }, 150);
  replayTimer = setTimeout(() => startForTrigger(), REPLAY_AFTER_MS);
}

// ---------- "when scrolled into view" ----------
// Waits until the component's middle reaches the trigger point (default the
// middle of the screen), eases the component to centre and holds the scroll
// for `scrollHold` ms before letting the page move on.
let revealed = false;
let holdUntil = 0;
function checkView() {
  const c = lab.config;
  const s = stage.getBoundingClientRect();
  const r = comp.getBoundingClientRect();
  if (!revealed && r.top + r.height / 2 <= s.top + s.height * (c.viewPoint / 100)) {
    revealed = true;
    play();
    if (c.scrollHold > 0) {
      stage.scrollTo({ top: stage.scrollTop + (r.top + r.height / 2) - (s.top + s.height / 2), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      holdUntil = performance.now() + c.scrollHold;
      stage.classList.add("holding");
    }
  } else if (revealed && (r.bottom <= s.top + 1 || r.top >= s.bottom - 1)) {
    revealed = false; // fully out of view: reset, so it reveals again next time
    seek(0);
  }
  if (holdUntil && performance.now() >= holdUntil) {
    holdUntil = 0;
    stage.classList.remove("holding");
  }
}
// While holding, wheel, touch and keyboard scrolling are swallowed.
for (const type of ["wheel", "touchmove"]) stage.addEventListener(type, (e) => holdUntil && e.preventDefault(), { passive: false });
window.addEventListener("keydown", (e) => holdUntil && ["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && e.preventDefault());

function startForTrigger() {
  const c = lab.config;
  stage.scrollTop = 0;
  revealed = false;
  holdUntil = 0;
  stage.classList.remove("holding");
  if (c.trigger === "load") prefersReducedMotion() ? seek(total) : play();
  else seek(0);
}

// ---------- image swap (stays on this computer) ----------
let objectUrl = null;
$("imgFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  img.src = objectUrl;
  img.alt = file.name;
  $("imgName").textContent = file.name;
  play();
});
$("replay").addEventListener("click", () => play());
window.addEventListener("resize", () => scheduleRebuild());

// ---------- frame ----------
let scrollP = 0;
function frame(dt, fps) {
  const c = lab.config;
  if (c.trigger === "scroll") {
    // How far the component has come into view, 0 → 1 over the first 80% of the window.
    const r = comp.getBoundingClientRect();
    const target = clamp((window.innerHeight - r.top) / (window.innerHeight * 0.8), 0, 1);
    scrollP = damp(scrollP, target, 0.15, dt);
    seek(scrollP * total);
  }
  if (c.trigger === "view") checkView();
  if (c.trigger !== "scroll" && playing) {
    t = Math.min(total, performance.now() - playStart);
    if (t >= total) {
      playing = false;
      finishedAt = performance.now();
    }
  } else if (lab.auto && c.trigger === "load" && t >= total && performance.now() - finishedAt > c.loopHold) {
    play();
  }
  lab.track(t / total);
  const now = anims.filter((x) => t >= x.start && t < x.end).map((x) => x.stage);
  lab.telemetry({
    time: `${Math.round(t)} / ${Math.round(total)} ms`,
    stage: now.length ? [...new Set(now)].join(" + ") : t >= total ? "Done" : "Waiting",
    fps: String(Math.round(fps)),
  });
}

await document.fonts.ready; // measure lines with the real fonts
build();
startForTrigger();
loop(frame);
