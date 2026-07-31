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
/                    the feed — every item, newest first
/inspiration/        the effects gallery
/inspiration/<slug>/ an individual effect
/<project>/          any other project at its own path
```

Do not split projects into separate repos. One repo gets one custom domain;
separate repos would mean a separate subdomain each, which fragments the site.

The URL taxonomy beyond this is deliberately unsettled. Ship the feed and a
few items first, see what the paths want to be, then formalize.

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
- **Feed is flat and reverse-chronological, with tags.** No sections. Sections
  get imposed later, once there are enough items to see a real shape.
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
- **The parameter contract.** How a demo file declares its own controls so
  the shell can auto-build a control rail. Locked in during shell work;
  expensive to change after five items exist.
- **Viewer model.** Full-bleed page per item, or a feed where items run in
  place? Affects routing, performance, and how the index reads.
- **Whether mar-dash moves here** or stays separate.

---

## Working notes

- Elliot is a designer who codes, not a career engineer. Explain reasoning,
  don't just ship diffs. Flag tradeoffs.
- He has ADHD. Long implicit multi-step plans get lost. Prefer small
  complete units of work with a clear stopping point.
- Deploy loop: edit locally → commit → push to `main` → live in ~1 minute.
- Design decisions belong in conversation, not buried in a coding session.
  If a real architectural fork appears, surface it rather than picking.
