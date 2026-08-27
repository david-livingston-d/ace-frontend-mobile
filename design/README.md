# Design reference — ACE Sales mobile

The visual source of truth for the M4 redesign: a **3D soft-depth** look (rounded
cards with layered soft shadows, glossy black hero tiles, pill controls) in
black / white / neutral only — **no accent colour**, Poppins throughout, light
and dark themes, and **one look for both Android and iOS** (no platform
variants).

## What lives where

| Path | What it is |
|---|---|
| `reference/redesign/index.html` | Every app screen as a 390 × 844 phone frame. The screens David reviews. |
| `reference/redesign/kit.html` | The component sheet — every primitive, light and dark side by side. |
| `reference/redesign/redesign.css` | The stylesheet both pages link. Its `:root` / `.thm-dark` custom properties are the **same numbers** `src/ui/tokens/*` carries in code. |
| `reference/mockup-recipe.md` | The visual recipe (page / card / hero / button / input / chip / badge / sheet / empty / skeleton / tab bar values, type scale, spacing, dark values), copied verbatim from the M4 spec. |
| `screenshots/` | Approved captures — Claude Design exports plus before/after emulator and simulator shots. Filled in at the end of M4 (Task 10). |

`reference/` is the **source**; `screenshots/` is the **record**.

## The review surface

The two HTML files are uploaded to the Claude Design project
`ac15968c-b10b-47a5-bfb7-7116210e7beb` under `redesign/`. **That canvas copy is
the review surface** — David tweaks elements there and approves, and the edited
files are read back and folded into the spec. The copies in this repo exist so
the reference is versioned next to the code that implements it; if the canvas
and this folder disagree, the canvas wins until the next read-back.

## Regenerating the preview

Both pages are plain static HTML with no build step and no external assets
(icons are an inline SVG sprite; the only network request is the Google Fonts
link for Poppins, which falls back to the system sans).

```sh
# serve the folder and open it — file:// works too in a normal browser
cd design/reference/redesign && python3 -m http.server 8931
open http://localhost:8931/index.html      # every screen
open http://localhost:8931/kit.html        # the component sheet
```

Each page's toolbar has a **light / dark** toggle (`.thm-dark` on `<body>`), a
**persona** toggle (executive hides the team chips and the Collected /
Outstanding cards; sales head shows them), and an anchor index of every frame.
Every screen is a `<section class="ph" id="…" data-screen="…">` with its name in
the `<h3>` caption above it, so a frame can be linked to or screenshotted on its
own.

## Rules the preview encodes

- Emphasis is **contrast and weight**, never colour. The only hues are the five
  semantic status tones (`neu / blu / grn / amb / red`) and product colour
  attributes (a garment's Blue / Red swatch is data, not chrome).
- **Uppercase with tracking only** on labels, badges, buttons, chips and tabs —
  never on body copy.
- Money is `₹` with Indian digit grouping (`₹1,24,500.00`) at weight 600.
- Gutter 20, card padding 18, bottom clearance 70; touch targets ≥ 44.
- Every list ends **above** the floating tab bar; every sheet's footer clears its
  last section.
- All colours, radii, shadows and type sizes come from the custom properties at
  the top of `redesign.css`. When the RN code needs a value that isn't there,
  add it to the tokens first — never hard-code it in a screen.
