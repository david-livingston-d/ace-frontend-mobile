// Poppins-Light is not in the bundled font set (only ExtraLight, Regular, Medium,
// SemiBold are linked — see android/app/src/main/assets/fonts). `fonts.light` maps to
// Regular so h2/h3 headings render Regular instead of a missing weight; likewise the
// mockup's one 700 (the due-strip count) renders SemiBold — no new fonts, per the brief.
export const fonts = { light: 'Poppins-Regular', regular: 'Poppins-Regular', medium: 'Poppins-Medium', semibold: 'Poppins-SemiBold', display: 'Poppins-ExtraLight' } as const;

/**
 * The type roles, taken from the redesign stylesheet (`redesign.css` §7 and
 * the component sections). Letter spacing is the CSS `em` value multiplied by
 * the font size, since RN's `letterSpacing` is absolute.
 *
 * Uppercase is a *role*, never a per-call-site style: `label`, `badge`, `tab`,
 * `button` and `chip` carry it, and `Text` uppercases their content for real
 * so the accessibility tree and text queries see the glyphs on screen.
 */
export const typography = {
  /* pre-M4 roles, kept so nothing has to be renamed */
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: 34 * 0.16 },
  h2: { fontFamily: fonts.light, fontSize: 26, lineHeight: 30, letterSpacing: 0.5 },
  h3: { fontFamily: fonts.light, fontSize: 20, lineHeight: 24, letterSpacing: 0.4 },
  h4: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  money: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  /** `.t22.w6` — was the ExtraLight 30 of the flat kit. */
  kpi: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26 },

  /* M4 roles */
  /** `.nvt.root` — a root screen's own title. */
  screenTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  /** `.h1` — a card's heading. */
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  /** `.t22.w6` — a KPI number. */
  stat: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 26 },
  /** A money figure inside a card header. */
  statMoney: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24 },
  /** `.t29.w6` — the record-payment amount field. */
  amountHero: { fontFamily: fonts.semibold, fontSize: 29, lineHeight: 34 },
  /** `.t12` — the dense row text lists are built from. */
  row: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  rowStrong: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  /** `.h1` inside a row/empty card — 13/600, the title of a list row. */
  rowTitle: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  /** `.t11.mut` — the line under a row. */
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  /** `.lbl` — 10/500, .2em, uppercase. */
  label: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, letterSpacing: 10 * 0.2, textTransform: 'uppercase' as const },
  /** `.bdg` — 9/600, .12em, uppercase. */
  badge: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 12, letterSpacing: 9 * 0.12, textTransform: 'uppercase' as const },
  /** `.tb` — 8/600, .16em, uppercase (tab bar labels). */
  tab: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 11, letterSpacing: 8 * 0.16, textTransform: 'uppercase' as const },
  /** `.btnP` — 11.5/500, .22em, uppercase. */
  button: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, letterSpacing: 11.5 * 0.22, textTransform: 'uppercase' as const },
  /** `.chip` — 10/500, .14em, uppercase. */
  chip: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, letterSpacing: 10 * 0.14, textTransform: 'uppercase' as const },
};

/** The roles whose content is uppercased, not merely `textTransform`ed. */
export const UPPERCASE_ROLES = ['label', 'badge', 'tab', 'button', 'chip'] as const;
