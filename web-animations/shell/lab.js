// Loose Ends · Web animations — the shared shell: dark HUD bars, the
// parameter drawer, keyboard shortcuts, preset tabs, theme pills, the
// scrub track, live readouts, "Copy config JSON" and an optional Notes panel.
//
// A module hands over a schema (its controls, grouped) and its defaults;
// the shell builds the drawer from them, so the controls, the defaults and
// the exported JSON can never drift apart. The module only reacts to
// onChange / onReset / onAuto / onStep / onScrub.

import { PALETTE } from "./palette.js";

// Themes pair a token accent with a token stage; the pill shows accent on stage.
export const THEMES = [
  ["theme-teal-ink", "Teal on ink", "#3fbdac", "#111111"],
  ["theme-orange-ink", "Orange on ink", "#f86916", "#111111"],
  ["theme-teal-navy", "Teal on navy", "#3fbdac", "#12263f"],
  ["theme-orange-navy", "Orange on navy", "#f86916", "#12263f"],
  ["theme-mist-navy", "Mist on navy", "#cfe5e6", "#12263f"],
  ["theme-light", "Orange on white", "#f86916", "#ffffff"],
];

const SHORTCUTS = [
  ["Space", "Auto-orbit on / off"],
  ["P", "Parameter drawer"],
  ["H", "Presentation mode (hide the HUD)"],
  ["R", "Reset to origin"],
  ["F", "Fullscreen"],
  ["1–4", "Presets"],
  ["← →", "Step one element"],
  ["Esc", "Close the drawer"],
  ["N", "Notes (when an effect has them)"],
  ["?", "These shortcuts"],
];

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
};

const fmt = (c, v) => (c.format ? c.format(v) : typeof v === "number" ? `${+v.toFixed(c.decimals ?? 2)}${c.unit ?? ""}` : String(v));

export function createLab(opts) {
  const { module, number, title, schema, defaults, presets = [], telemetry = [], version = "2.0" } = opts;
  const config = { ...defaults };
  const inputs = new Map();
  let auto = false;
  let activePreset = null;

  // ---- top bar ----
  const presetButtons = presets.map((p, i) =>
    h("button", { class: "preset", type: "button", "aria-pressed": "false", title: `${p.label} (${i + 1})`, onclick: () => applyPreset(i) }, h("kbd", { text: String(i + 1) }), h("span", { text: p.label }))
  );
  const autoBtn = h("button", { class: "action", type: "button", "aria-pressed": "false", title: "Auto-orbit (Space)", onclick: () => setAuto(!auto) }, h("span", { text: "Auto" }), h("kbd", { text: "Space" }));
  const drawerBtn = h("button", { class: "action", type: "button", "aria-pressed": "false", "aria-controls": "drawer", title: "Parameters (P)", onclick: () => toggleDrawer() }, h("span", { text: "Parameters" }), h("kbd", { text: "P" }));
  const hudBtn = h("button", { class: "action", type: "button", title: "Presentation mode (H)", onclick: () => toggleHud() }, h("span", { text: "Present" }), h("kbd", { text: "H" }));
  // Notes: the effect's writeup (what it is, where it comes from, when to use it), in a panel on the right.
  const notesBtn = opts.notes ? h("button", { class: "action", type: "button", "aria-pressed": "false", "aria-controls": "notes", title: "Notes (N)", onclick: () => toggleNotes() }, h("span", { text: "Notes" }), h("kbd", { text: "N" })) : null;
  const notesBody = h("div", { class: "notes-body" });
  const notes = opts.notes
    ? h("aside", { class: "notes", id: "notes", "aria-label": "Notes", hidden: true }, h("div", { class: "drawer-head" }, h("h2", { text: "Notes" }), h("button", { class: "close", type: "button", "aria-label": "Close notes", onclick: () => toggleNotes(false) }, "×")), notesBody)
    : null;
  let notesLoaded = false;
  async function toggleNotes(force) {
    if (!notes) return;
    const open = force ?? notes.hidden;
    notes.hidden = !open;
    notesBtn.setAttribute("aria-pressed", String(open));
    document.body.classList.toggle("notes-open", open); // the stage makes room, as it does for the drawer
    window.dispatchEvent(new Event("resize"));
    if (open && !notesLoaded) {
      notesLoaded = true;
      try {
        notesBody.innerHTML = await (await fetch(opts.notes)).text(); // the effect's own notes file
      } catch {
        notesBody.textContent = "Couldn't load the notes.";
      }
    }
  }
  const header = h(
    "header",
    { class: "hud-header" },
    h("a", { class: "crumb", href: "../index.html" }, h("span", { class: "dot" }), h("span", { class: "lab", text: "Web animations" }), h("span", { class: "sep", text: "/" }), h("span", { class: "here", text: `${number} ${title}` })),
    presets.length ? h("nav", { class: "presets", "aria-label": "Presets" }, presetButtons) : h("span"),
    h("div", { class: "actions" }, autoBtn, notesBtn, drawerBtn, hudBtn)
  );

  // ---- bottom bar ----
  const fill = h("div", { class: "fill" });
  const knob = h("div", { class: "knob" });
  const track = h("div", { class: "track", role: "slider", tabindex: "0", "aria-label": "Scrub", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, fill, knob);
  const telemetryEls = new Map();
  const tele = h(
    "div",
    { class: "telemetry", "aria-live": "off" },
    telemetry.map((t) => {
      const b = h("b", { text: "—" });
      telemetryEls.set(t.key, b);
      return h("span", { class: t.extra ? "extra" : null }, t.label, b);
    })
  );
  const themePills = THEMES.map(([cls, name, accent, stage]) =>
    h("button", { class: "theme-pill", type: "button", title: name, "aria-label": `${name} theme`, "aria-pressed": "false", style: `background:linear-gradient(135deg, ${accent} 50%, ${stage} 50%)`, onclick: () => set("theme", cls) })
  );
  // Theme pills only on modules that use a theme (07's surfaces come from the design system instead).
  const footer = h("footer", { class: "hud-footer" }, track, tele, "theme" in defaults ? h("div", { class: "themes", role: "group", "aria-label": "Theme" }, themePills) : null);

  // ---- drawer ----
  const controlEl = (c) => {
    const id = `ctrl-${c.key}`;
    if (c.type === "swatch") {
      // Colour pickers only ever offer the Loose Ends tokens (shell/palette.js), plus any leading options (e.g. "Theme accent").
      const dot = h("span", { class: "swatch-dot", "aria-hidden": "true" });
      const sel = h(
        "select",
        { id, onchange: (e) => set(c.key, e.target.value, true) },
        (c.lead ?? []).map(([v, l]) => h("option", { value: v, text: l })),
        Object.entries(PALETTE).map(([family, steps]) => h("optgroup", { label: family }, steps.map(([hex, name]) => h("option", { value: hex, text: `${name} · ${hex}` }))))
      );
      inputs.set(c.key, { el: sel, c, dot });
      return h("div", { class: "ctrl" }, h("label", { for: id, text: c.label }), h("span", { class: "swatch-pick" }, dot, sel));
    }
    if (c.type === "text") {
      // Free text (copy): a single line, or a few lines with `rows`.
      const field = c.rows
        ? h("textarea", { id, rows: c.rows, class: "text-field", oninput: (e) => set(c.key, e.target.value, true) })
        : h("input", { id, type: "text", class: "text-field", oninput: (e) => set(c.key, e.target.value, true) });
      inputs.set(c.key, { el: field, c });
      return h("div", { class: "ctrl text" }, h("label", { for: id, text: c.label }), field);
    }
    if (c.type === "select") {
      const sel = h("select", { id, onchange: (e) => set(c.key, e.target.value, true) }, c.options.map(([v, l]) => h("option", { value: v, text: l })));
      inputs.set(c.key, { el: sel, c });
      return h("div", { class: "ctrl" }, h("label", { for: id, text: c.label }), sel);
    }
    if (c.type === "toggle") {
      const box = h("input", { id, type: "checkbox", onchange: (e) => set(c.key, e.target.checked, true) });
      inputs.set(c.key, { el: box, c });
      return h("div", { class: "ctrl toggle" }, h("label", { for: id, text: c.label }), box);
    }
    const out = h("output", { for: id });
    const range = h("input", { id, type: "range", min: c.min, max: c.max, step: c.step ?? "any", oninput: (e) => set(c.key, Number(e.target.value), true) });
    inputs.set(c.key, { el: range, c, out });
    return h("div", { class: "ctrl" }, h("label", { for: id, text: c.label }), out, range);
  };
  // ---- saved sets: named parameter sets, kept in this browser (localStorage), per module ----
  const storeKey = `web-animations:sets:${module}`;
  const readSets = () => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) ?? "{}");
    } catch {
      return {};
    }
  };
  const writeSets = (sets) => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(sets));
      return true;
    } catch {
      return false;
    }
  };
  const setName = h("input", { type: "text", id: "set-name", placeholder: "Name this set", maxlength: "60", "aria-label": "Name for the saved set" });
  const setList = h("select", { id: "set-list", "aria-label": "Saved sets" });
  const setMsg = h("p", { class: "sets-msg", "aria-live": "polite" });
  const pasteBox = h("textarea", { rows: "6", placeholder: "Paste a config JSON copied from this module", "aria-label": "Config JSON to apply", hidden: true });
  const pasteApply = h("button", { class: "action", type: "button", hidden: true, onclick: () => applyPasted() }, "Apply pasted config");
  const say = (text) => {
    setMsg.textContent = text;
    clearTimeout(say.t);
    say.t = setTimeout(() => (setMsg.textContent = ""), 3000);
  };
  function refreshSets(selected) {
    const names = Object.keys(readSets()).sort((a, b) => a.localeCompare(b));
    setList.replaceChildren(names.length ? h("option", { value: "", text: `Saved sets (${names.length})` }) : h("option", { value: "", text: "No saved sets yet" }), ...names.map((n) => h("option", { value: n, text: n })));
    setList.value = selected && names.includes(selected) ? selected : "";
  }
  function saveSet() {
    const name = setName.value.trim() || `Set ${new Date().toLocaleString()}`;
    const sets = readSets();
    const replacing = name in sets;
    sets[name] = { ...config };
    if (!writeSets(sets)) return say("Couldn't save: this browser is blocking storage.");
    setName.value = "";
    refreshSets(name);
    say(replacing ? `Updated “${name}”.` : `Saved “${name}”.`);
  }
  function loadSet() {
    const set = readSets()[setList.value];
    if (!set) return say("Pick a saved set first.");
    setMany(Object.fromEntries(Object.entries(set).filter(([k]) => k in config)));
    markPreset(null);
    say(`Loaded “${setList.value}”.`);
  }
  function deleteSet() {
    const name = setList.value;
    if (!name) return say("Pick a saved set first.");
    const sets = readSets();
    delete sets[name];
    writeSets(sets);
    refreshSets();
    say(`Deleted “${name}”.`);
  }
  function applyPasted() {
    try {
      const data = JSON.parse(pasteBox.value);
      if (data.module && data.module !== module) return say(`That config is for ${data.module}, not this module.`);
      const known = Object.fromEntries(Object.entries(data).filter(([k]) => k in config));
      if (!Object.keys(known).length) return say("No settings for this module in that JSON.");
      setMany(known);
      markPreset(null);
      pasteBox.value = "";
      say(`Applied ${Object.keys(known).length} settings.`);
    } catch {
      say("That isn't valid JSON. Copy it again with Copy config JSON.");
    }
  }
  setName.addEventListener("keydown", (e) => e.key === "Enter" && saveSet());
  const setsGroup = h(
    "section",
    { class: "group sets" },
    h("h3", { text: "Saved sets" }),
    h("div", { class: "sets-row" }, setName, h("button", { class: "action", type: "button", onclick: saveSet }, "Save")),
    h("div", { class: "sets-row" }, setList, h("button", { class: "action", type: "button", onclick: loadSet }, "Load"), h("button", { class: "action", type: "button", onclick: deleteSet }, "Delete")),
    h(
      "button",
      {
        class: "linkish",
        type: "button",
        onclick: () => {
          pasteBox.hidden = !pasteBox.hidden;
          pasteApply.hidden = pasteBox.hidden;
          if (!pasteBox.hidden) pasteBox.focus();
        },
      },
      "Paste a config JSON…"
    ),
    pasteBox,
    pasteApply,
    setMsg
  );

  const copyBtn = h("button", { class: "action", type: "button", onclick: () => copyConfig() }, "Copy config JSON");
  const resetBtn = h("button", { class: "action", type: "button", onclick: () => resetDefaults() }, "Reset defaults");
  const drawer = h(
    "aside",
    { class: "drawer", id: "drawer", "aria-label": "Parameters", "aria-hidden": "true" },
    h("div", { class: "drawer-head" }, h("h2", { text: "Parameters" }), h("button", { class: "close", type: "button", "aria-label": "Close parameters", onclick: () => toggleDrawer(false) }, "×")),
    h("div", { class: "drawer-body" }, setsGroup, schema.map((g) => h("section", { class: "group" }, h("h3", { text: g.group }), g.controls.map(controlEl)))),
    h("div", { class: "drawer-foot" }, copyBtn, resetBtn)
  );

  // ---- shortcut help ----
  const help = h(
    "div",
    { class: "help", role: "dialog", "aria-label": "Keyboard shortcuts", hidden: true },
    h("h3", { text: "Keyboard shortcuts" }),
    h("div", { class: "specs-grid" }, SHORTCUTS.flatMap(([k, d]) => [h("span", { class: "spec-label" }, h("kbd", { class: "k", text: k })), h("span", { class: "spec-value", text: d })]))
  );

  // A way back out of presentation mode (Elliot, 2026-10-24): a faint × in the corner, shown only while the HUD is hidden.
  const exitPresent = h("button", { class: "exit-present", type: "button", "aria-label": "Exit presentation mode (Esc or H)", title: "Exit presentation mode (Esc or H)", onclick: () => toggleHud(false) }, "×");

  document.body.append(...[header, drawer, footer, help, exitPresent, notes].filter(Boolean));

  // ---- state ----
  function reflect(key) {
    const i = inputs.get(key);
    if (i) {
      if (i.c.type === "toggle") i.el.checked = !!config[key];
      else i.el.value = config[key];
      if (i.dot) i.dot.style.background = String(config[key]).startsWith("#") ? config[key] : "var(--accent)";
      if (i.out) i.out.textContent = fmt(i.c, config[key]);
    }
    if (key === "theme") {
      for (const [cls] of THEMES) document.body.classList.toggle(cls, cls === config.theme);
      themePills.forEach((p, n) => p.setAttribute("aria-pressed", String(THEMES[n][0] === config.theme)));
    }
  }
  function set(key, value, fromUser = false) {
    if (!(key in config)) return;
    config[key] = value;
    reflect(key);
    if (fromUser && activePreset != null) markPreset(null);
    opts.onChange?.(config, key);
  }
  function setMany(values) {
    for (const [k, v] of Object.entries(values)) if (k in config) {
      config[k] = v;
      reflect(k);
    }
    opts.onChange?.(config, null);
  }
  function markPreset(i) {
    activePreset = i;
    presetButtons.forEach((b, n) => b.setAttribute("aria-pressed", String(n === i)));
  }
  function applyPreset(i) {
    const p = presets[i];
    if (!p) return;
    setMany(p.values);
    markPreset(i);
  }
  function resetDefaults() {
    setMany({ ...defaults, theme: config.theme });
    markPreset(presets.length ? 0 : null);
  }
  function setAuto(on) {
    auto = on;
    autoBtn.setAttribute("aria-pressed", String(on));
    opts.onAuto?.(on);
  }
  function toggleDrawer(force) {
    const open = force ?? !drawer.classList.contains("open");
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    drawerBtn.setAttribute("aria-pressed", String(open));
    // The stage moves over beside the drawer instead of sitting under it (Elliot, 2026-10-24: "push over the
    // viewport and not overlap it"). Modules size from the stage, so a resize lets them re-fit the new space.
    document.body.classList.toggle("drawer-open", open);
    window.dispatchEvent(new Event("resize"));
  }
  function toggleHud(force) {
    const hidden = force ?? !document.body.classList.contains("hud-hidden");
    document.body.classList.toggle("hud-hidden", hidden);
    // Modules that fit their scene to the window re-fit to the full screen once the bars are gone.
    window.dispatchEvent(new Event("lab:hud"));
    window.dispatchEvent(new Event("resize")); // the stage widens again when the drawer hides with the HUD
  }
  async function copyConfig() {
    const json = JSON.stringify({ module, version, ...config }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      copyBtn.textContent = "Copied";
    } catch {
      console.log(json);
      copyBtn.textContent = "Copy failed: see console";
    }
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Copy config JSON";
      copyBtn.classList.remove("copied");
    }, 1600);
  }

  // ---- scrub track (fraction 0–1) ----
  let dragging = false;
  const scrubTo = (clientX) => {
    const r = track.getBoundingClientRect();
    opts.onScrub?.(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };
  track.addEventListener("pointerdown", (e) => {
    dragging = true;
    track.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  });
  track.addEventListener("pointermove", (e) => dragging && scrubTo(e.clientX));
  track.addEventListener("pointerup", () => (dragging = false));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      opts.onStep?.(e.key === "ArrowRight" ? 1 : -1);
    }
  });

  // ---- keyboard; never while typing in a control ----
  window.addEventListener("keydown", (e) => {
    const typing = e.target instanceof HTMLElement && e.target.closest("input, select, textarea");
    if (e.key === "Escape") {
      if (document.body.classList.contains("hud-hidden")) toggleHud(false); // Esc leaves presentation mode first
      else toggleDrawer(false);
      help.hidden = true;
      toggleNotes(false);
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        setAuto(!auto);
        break;
      case "KeyP":
        toggleDrawer();
        break;
      case "KeyH":
        toggleHud();
        break;
      case "KeyN":
        toggleNotes();
        break;
      case "KeyR":
        opts.onReset?.();
        break;
      case "KeyF":
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case "ArrowLeft":
      case "ArrowRight":
        e.preventDefault();
        opts.onStep?.(e.code === "ArrowRight" ? 1 : -1);
        break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) applyPreset(Number(e.code.slice(5)) - 1);
        else if (e.key === "?") help.hidden = !help.hidden;
    }
  });

  for (const k of Object.keys(config)) reflect(k);
  markPreset(presets.length ? 0 : null);
  refreshSets();

  return {
    config,
    set,
    setMany,
    setAuto,
    get auto() {
      return auto;
    },
    telemetry(values) {
      for (const [k, v] of Object.entries(values)) {
        const el = telemetryEls.get(k);
        if (el && el.textContent !== v) el.textContent = v;
      }
    },
    track(fraction) {
      const pct = `${(fraction * 100).toFixed(2)}%`;
      fill.style.width = pct;
      knob.style.left = pct;
      track.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
    },
  };
}
