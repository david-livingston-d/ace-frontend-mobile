/** The 4-pt spacing scale. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

/**
 * Named layout figures from the redesign stylesheet. Everything here is a
 * 4-pt multiple except `cardPad` (18) and `rowPadH` (14) — documented
 * exceptions taken verbatim from the mockup (`--card-pad`, `.card.row-pad`)
 * rather than rounded, so the app and the approved design stay identical.
 */
/** Screen side padding — every screen's content shares this left edge. */
export const gutter = 20;
/** `.card` padding. */
export const cardPad = 18;
/** `.card.row-pad` — a list row inside a card. */
export const rowPadV = 12;
export const rowPadH = 14;
/** Gap between rows of a list. */
export const gapList = 10;
/** Gap in a 2-column grid. */
export const gapGrid = 12;
/** Gap between chips in a row. */
export const gapChips = 8;
/** Gap between a field and its label/helper. */
export const gapField = 6;
/** Gap between inline items inside one control — a field's icon and its text,
 * a row's badge and its title (`.g10`). */
export const gapInline = 10;
