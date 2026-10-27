# Web animations · Loose Ends

Seven motion studies in one control shell, by Elliot Olson. Each has its parameters out on the table:
presets, live controls, a scrub track, saved sets and Copy config JSON.

| | |
|---|---|
| 01 Torus Row | Eleven rings turning out of phase |
| 02 Torus Row Slide | Fifteen rings, face-on at the ends to edge-on in the middle |
| 03 Scroll Video Scrubber | Scroll drives a video frame by frame (drop in your own clip) |
| 04 Concentric Circles | Rings that lean toward the cursor |
| 05 Torus Ring Carousel | Twelve rings on a circle; scroll or drag to turn it |
| 06 Ring Arc | The carousel's front half, back half fading out |
| 07 Image + Copy Reveal | A two-stage entrance with every timing exposed |

## Running it

It needs a small local web server (double-clicking `index.html` won't work: browsers block ES modules
and the settings files when a page is opened straight from disk). Use whichever the computer allows,
run inside this folder, then open the address:

| Option | Command | Address |
|---|---|---|
| Node | `node serve.mjs` | http://localhost:5173/ |
| Python 3 | `python -m http.server 5173` (or `py -m http.server 5173`) | http://localhost:5173/ |
| VS Code | "Live Server" extension → right-click `index.html` → Open with Live Server | http://127.0.0.1:5500/ |

Stop it with Ctrl+C. Nothing else to install: three.js ships in `vendor/three/`, so it runs offline and
behind firewalls. Only the fonts (Google Fonts) come from the internet, with system fallbacks.

## Keys

**P** parameters · **N** notes · **H** present mode (× or Esc to leave) · **Space** auto · **1–4** presets ·
**← →** step · **R** reset · **F** fullscreen · **?** all shortcuts

## Browsers

Chrome/Edge 89+, Firefox 108+, Safari 16.4+. Tested October 2026 in Chromium, Firefox and WebKit,
desktop and phone sizes.

## Licence

Code MIT, © Elliot Olson. three.js 0.160.0 is MIT (`vendor/three/LICENSE`).
