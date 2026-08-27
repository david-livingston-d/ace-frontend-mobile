<!-- Copied verbatim from the M4 spec (`lets-plan-for-mobile-wiggly-sun.md`),
     section "Mockup visual recipe". Do not edit here: change the spec, then
     re-copy, and keep redesign/redesign.css in step with these numbers. -->

### Mockup visual recipe (extracted from `Workholic Mobile App.dc.html`, 31 artboards A0–G7)

Header note: *"3D soft-depth look: rounded cards, deep soft shadows, glossy black hero cards, pill controls — replaces Ace's flat square web treatment."* Light-first; dark via root class `thm-dark`.

- Page `#f5f5f7`; card `#fff r20 p18 shadow 0 10px 28px rgba(13,13,13,.07)`; hero tile `.kdark` radial-gradient `#3d3d3f→#1a1a1c→#0d0d0d`, `shadow 0 18px 36px .3`; note card `r14`; hairline `rgba(13,13,13,.07)`; avatar radial gradient + shadow.
- Buttons: primary `h54 r27` radial-gradient jet, text `11.5/500 ls .22em uppercase`, `shadow 0 14px 28px .32`; outline `h48 r24 #fff`, `10.5/600 ls .18em`, `shadow 0 8px 20px .08 + inset ring .1`; FAB `50×50 r26` (Android `r17`), `shadow 0 12px 26px .38`; circular back button `42 r50% #fff`.
- Inputs `h50 r16 #fff border rgba(13,13,13,.08) inset 0 2px 4px .06`; search = pill, `shadow 0 8px 20px .08 + inset ring`; label `9.5/500 ls .2em uppercase #8f8f96`; error border `rgba(168,60,49,.4)` + helper `#a83c31`; segmented `#eaeaee r24 p4 inset`, on = jet + shadow; stepper `#eeeef1 r19 h38 inset`, active = `inset 0 0 0 1.5px jet`.
- Chips `10/500 ls .14em uppercase p9×15 r999 #fff shadow .07 + inset ring`; on = jet + `shadow 0 8px 18px .3`; colour swatch `34 r50%` inset ring + `shadow 0 4px 10px .1`; selected = halo `0 0 0 2.5px page, 0 0 0 4.5px jet`.
- KPI grid 2-col gap 12, tile `p13 centred`, first tile hero-dark; number `22/600`, money `20/600`; tone via number colour + tinted shadow (`rgba(168,60,49,.14)` overdue, `rgba(61,115,80,.14)` positive).
- Order card `p9×14`: title stack + badges right, `.hr`, metrics strip (Qty / Reserved / To deliver / To collect). Settings rows: one card `p0 overflow hidden`, rows `p13×16` hairline-top, chevron. Swipe-to-delete: `r20` wrapper, 64 px `#a83c31` action.
- Badges `9/600 ls .12em p5×10 r12`, 9 tones (neu/blu/ind/pur/vio/grn/tea/amb/red/slt).
- Sheet `#f8f8fa r30 top`, `shadow 0 -24px 60px .3`, veil `rgba(13,13,13,.45) blur(3px)`, grab `44×5 r3`; footer `btnO flex1 + btnP flex2 h48`.
- Empty state card `p34×20` centred: 58 px icon disc `#eeeef1`, `13/600` title, `11 mut` body, `btnO 180×42`. Skeleton shimmer `r10` gradient 1.4 s. Error toast `rgba(32,32,35,.97) r16`.
- Tab bar floating `bottom 24 / inset 18 / h66 r33` (Android `r22`), `rgba(255,255,255,.92) blur 14`, `shadow 0 18px 44px .2`, labels `8/600 ls .16em uppercase`; 5 slots Home · Orders · FAB · Payments · More.
- Type: screen title `16/600` (tab roots `20/600`), greeting `20/600`, card title `17/600`, stat `22/600`, amount hero `29/600` (₹ glyph `24/300 @.55`), body 13, row 12, caption 11 (`#8f8f96`), label 9.5, badge 9, tab 8. Money `600 ls .01em`.
- Spacing: screen pad 20; body gap 14; card pad 18 (rows 9×14 / 12×14, tiles 13); grid gaps 12 / 9–10 / 7–8; bottom clearance 70; sheet bottom pad 40. Radii used: 999/33/27/26/24/20/19/18/16/14/12/10.
- Motion: shimmer 1.4 s; caret 1.1 s; `pop` .5–.6 s `cubic-bezier(.22,.61,.36,1)` (splash/success); `pls` 2 s ring pulse (current step / timeline node); loader bar 1.2 s.
- Dark: board `#0f0f11`, phone `#141416`, card/input/chip `#1e1e21`, sheet `#161618`, seg/stepper `#232326`, text `#e8e8ec`, muted `#8f8f96`, hairline `rgba(244,244,244,.08–.14)`, tab bar `rgba(26,26,29,.92)`; primary/selected flip to `#f4f4f4` on `#0d0d0d`; shadows deepen to `rgba(0,0,0,.3–.6)`; semantic pairs red `#361d1a/#e08a80`, green `#1e2c22/#8fcea4`, amber `#332a18/#e0b36a`, blue `#1f2a3a/#8fb2e0`.
- Best artboards: dashboard A2/F1; order list A2/G1/A3; variant picker C1/C2; cart C4; payment D1; empty+skeleton B4; profile G6; sheet G2; success C6; timeline D4.

Ace DS readme (flat, hairline, square) is **overridden** for mobile by David's soft-depth ruling; colours (jet/void/bright white/neutral ramp/semantic set, no accent) and Poppins remain binding.
