# Loose Ends

A personal workshop site by Elliot Olson — Art Director at F5, Seattle. Photographer.

Live at **loose-ends.elliotolson.com**. Repo is `bigelliot-cmd/loose-ends`,
served by GitHub Pages from `main` at root.

The main portfolio, elliotolson.com, is a separate Squarespace site. It links here.
Nothing in this repo touches it.

---

## What this is

A place for experiments, tools, and half-finished things. The first wing is a
gallery of web animation and effects — curated, credited, and annotated, not
claimed as original work. Other wings will follow: an SVG blob generator, a
Mariners dashboard, whatever comes next.

The connective tissue is the person, not the medium. Don't assume a project
here is about animation, and don't assume it's about photography.

**The name is understatement, not apology.** "Loose Ends" only works because
the work behind it is serious. Nothing in the copy, UI, or writing should
lean into scrappiness as a personality. The frame is disciplined; the
contents are allowed to be rough.

---

## Structure

One repo, one custom domain, projects as paths underneath.

```
/                        nav — lists the rooms that exist, nothing else
/writings/               a room: list of posts, newest first
/writings/<slug>/        an individual post
/web-animations/         a room: the effects gallery
/web-animations/<slug>/  an individual effect
/mar-dash/               a room: the Mariners dashboard
/assets/                 shared css/js/fonts — not a room, no nav entry
/<project>/              any other room, at its own path
```

Do not split projects into separate repos. One repo gets one custom domain;
separate repos would mean a separate subdomain each, which fragments the site.

The URL taxonomy beyond this is deliberately unsettled. Ship a few rooms
first, see what the paths want to be, then formalize.

**A room only gets a nav entry once it has real content in it.** Never add
Motion, Dashboards, or any other placeholder room to the nav ahead of time
— they get created (and only then linked from `/`) when there's actually
something to click through to.

TradeFlow was considered as a candidate project path and explicitly kept
out (2026-07-31) — it's a separate, unpublished project with its own repo
question and a live-API-key exposure problem that a static, backend-less
site can't solve. Don't propose folding it in without that being reopened.

---

## Decided — do not relitigate

- **Host:** GitHub Pages. Cloudflare Pages was evaluated and rejected —
  Cloudflare removed Pages project creation from the dashboard, and Workers
  custom domains would require moving nameservers off Squarespace.
- **DNS:** stays at Squarespace. A CNAME on `loose-ends` points to
  `bigelliot-cmd.github.io`.
- **No build step** unless something genuinely needs one. Hand-written HTML,
  CSS, and JS. If a build becomes necessary, GitHub Actions — not a
  framework by default.
- **`.nojekyll` is in the repo root** (added 2026-08-15). Nothing here is
  authored as Jekyll, but GitHub Pages runs every site through Jekyll's
  processor by default regardless — without this file, an underscore-
  prefixed folder (`_posts`, `_includes`, anything) would silently vanish
  from the live site. This makes "hand-rolled static HTML" actually true
  at the hosting layer, not just true in how it's written.
- **Rooms, not one sitewide feed** (revised 2026-08-15, supersedes the
  original "flat feed, no sections" idea for `/`). `/` is nav only — a mark,
  the name, and links to whatever rooms currently have content. Each room
  owns its own flat, reverse-chronological, tagged listing internally
  (`/writings/` lists posts newest-first) — the original flat-feed idea
  survives at the room level, it's just not one sitewide list anymore.
- **The shell carries the polish.** Every item sits in the same well-made
  frame with the same controls and metadata slots. That consistency is what
  makes rough contents read as a practice rather than a junk drawer.
- **Attribution is structural, not a disclaimer.** Every effect carries
  technique origin with a real link. Never republish someone's source
  wholesale.
- **Own code is MIT.**
- **GSAP is available.** Free since April 2025 including all plugins
  (SplitText, MorphSVG, DrawSVG), commercial use covered.
- **Anime.js is already in Elliot's toolkit** and is a reasonable default for
  simple orchestration.
- **Parameter contract:** each effect ships a sidecar manifest (JSON/JS
  metadata file, separate from the demo's own code) declaring its controls.
  The shell reads the manifest to build the control rail without loading or
  executing the demo — this is what makes it possible to show the rail
  before the effect is in view. CSS custom properties are the default way a
  control reaches the demo (shell writes `--speed`, `--amplitude`, etc. onto
  a wrapper element); a JS callback is the escape hatch for anything CSS
  can't express (discrete params, canvas/WebGL state).
- **Viewer model (revised 2026-10-25, supersedes the page-with-rail layout):**
  `/web-animations/` is the motion lab shell, not a scrolling article. Each
  effect is a full-screen stage at `/web-animations/<NN-slug>/` with slim HUD
  bars, a parameter drawer that pushes the stage aside, presets, a scrub
  track and Present mode (H). The writeup lives in a Notes panel (N) that
  also pushes the stage. Elliot tried the "demo beside a rail, writeup below"
  page and rejected it ("worse ... the lab layout was so much more
  successful") — don't rebuild it. The hub lists effects as cards, not live
  demos. Controls are declared per effect (schema in module.js, defaults in
  config.json) and the shell builds the drawer from them.
- **Mar-dash moves into loose-ends**, at `/mar-dash/`.
- **Visual style ties to elliotolson.com** (2026-07-31, confirmed against
  that site's actual compiled CSS, not guessed): typography is **Inter**
  for body/nav/values and **Inter Tight** (heavy, ~900 weight, often
  uppercase) for headings and labels. Base palette is near-black on white,
  with body copy a soft dark grey (`#525252`) rather than pure black.
  **`#f86916`** (burnt orange) is the one accent color, reused exactly —
  it's what elliotolson.com uses for every interactive/button state, and
  it does the same job here: the color that means "this is interactive"
  (slider thumbs, toggle-on states, focus rings, links). One accent doing
  all the signaling, not a palette — this still holds on the primary
  surface; the additions below are scoped elsewhere, not a second accent
  competing with it.
- **Orange is scoped to small elements — never a large fill, never body
  text.** Buttons, thumbs, underlines, focus rings: yes. A hero fill, a
  large card background, body copy: no. Link text stays `--ink` on hover —
  the underline intensifies instead, since accent-on-white text can't
  clear 4.5:1 at any weight. **Exception, decided 2026-07-31:** button
  labels are white on the accent fill (2.99:1, under the small-text AA
  minimum) — Elliot's explicit call, wants white over the ink alternative
  even knowing the number. Bold weight (700) on button labels to help
  perceived legibility, though it doesn't create an official WCAG
  exception at this text size. Don't "fix" this back to ink without
  asking — it's a deliberate, informed trade, not an oversight.
- **Logo mark:** `Simly.webp` (repo root), used as favicon and header mark.
  Its teal, `#3fbdac`, sampled directly from the file, not eyeballed.
  Verified 2.3:1 contrast on white — too low for text there, so it's a
  graphic/heading color on the alt surface only (6.6:1), never body copy
  on the light surface.
- **Alt surface, added deliberately (2026-07-31):** `--bg-alt: #12263f`
  (dark navy) with `--text-alt: #cfe5e6` (11.6:1 contrast, verified) as a
  second, intentional surface — opted into per-element via `.surface-alt`,
  never through `prefers-color-scheme`. This is not the dark-mode auto-swap
  that broke contrast earlier; it's a separate designed pairing to have in
  reserve (e.g. a highlighted feed item, a raised panel), applied on
  purpose or not at all.
- **This is the v1 visual foundation, locked (2026-07-31).** `tokens.css` +
  `style-guide.html` are canonical, not a one-off — every project under
  loose-ends builds on these tokens rather than inventing its own. Extend
  by adding to `tokens.css`, don't fork it per project.
- **Links:** no underline at rest, no arrow (dropped 2026-08-15 — tried
  once, didn't like it). Color is `--accent-hover` (`#df5607`), not
  `--ink` — 3.84:1 on white, same accepted tradeoff class as the button
  labels, chosen because it's the higher-contrast of the two accent
  tones. Color never changes on hover (so that number can't get worse);
  hover adds an underline instead, which isn't subject to text-contrast
  rules.
- **The index (`/`) plays a once-per-visit intro, `/writings/` doesn't.**
  On `/`, the epigraph ("We swore we tied up...") and the revealed room
  nav share one CSS grid cell (stacked, both centered in the same spot)
  — the epigraph fades in, holds 3s, fades out **completely**, then the
  nav fades in after, not a crossfade. Via `sessionStorage`, not
  `localStorage`, so it replays each new visit (tab/window) rather than
  once ever. `/writings/` is deliberately plain: a heading and a linked
  list of posts, no animation, no epigraph — it's a nav page for the
  actual writing, not a second intro. Reduced-motion visitors skip
  straight to the final state on `/`, same as everywhere else.
- **`.big-nav`, shared by root's room list and a room's own post list
  (2026-08-15):** a big linked heading per item. Resting color is
  `--text-soft` (`#999999`, a third grey between `--text` and `--line`)
  — deliberately soft; the rollover is where an item announces itself,
  not its resting state. Rollover fills the tile with `--bg-alt` /
  `--text-alt`, the same verified dark pairing `.surface-alt` already
  uses (11.6:1) — reused rather than a new guess. Substantial padding
  (`--space-6` / `--space-7`) so the fill reads as a real tile.

---

## Every effect ships with writing

The demos are the hook; the writing is the credential. Anyone can embed a
shader. Judgment about when to use it is the thing only someone who ships
work can offer.

Template, 200–350 words:

1. What it is, in one sentence a client would understand
2. Where it came from — technique origin, real link
3. Support and failure mode — what actually happens in Firefox
4. **When I'd use it. When I wouldn't.** ← the money paragraph
5. Implementation notes

Write this alongside the effect, never batched afterward. Batched writeups
come out generic.

Voice: dry, plain, specific. No adjectives doing sales work. The name sets
the register — match it.

---

## Quality floor

Non-negotiable on everything, including rough items:

- `prefers-reduced-motion` respected
- Visible keyboard focus
- Responsive to mobile
- Nothing runs until it's in view — lazy-load every canvas and heavy demo
- Progressive enhancement: author the finished state as the default, layer
  the animation on top. A browser that ignores the effect must still show
  correct content.

Performance is a feature here, not an afterthought. This is a page full of
GPU work; treat the frame budget as a design constraint.

---

## Still open — do not invent answers

Ask before assuming. These are decisions Elliot makes, not defaults to pick.

- **The subtitle.** One line under the name on the index. Signals that these
  are real, working, considered things that happen not to be finished. Not
  yet written.
- **A future "Inspiration" project.** Not the effects gallery (that's
  `/web-animations/`) — a separate, later thing, an aggregator of where
  Elliot draws inspiration from. Unscoped, parked for later.
- **Deeper tint/shade palette.** Elliot's building this out further —
  more steps around the existing colors in `tokens.css`, not a
  replacement. Don't invent this ahead of him.

---

## Working notes

- Elliot is a designer who codes, not a career engineer. Explain reasoning,
  don't just ship diffs. Flag tradeoffs.
- He has ADHD. Long implicit multi-step plans get lost. Prefer small
  complete units of work with a clear stopping point.
- Deploy loop: edit locally → commit → push to `main` → live in ~1 minute.
- Design decisions belong in conversation, not buried in a coding session.
  If a real architectural fork appears, surface it rather than picking.
