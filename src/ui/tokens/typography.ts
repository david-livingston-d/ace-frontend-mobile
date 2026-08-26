// Poppins-Light is not in the bundled font set (only ExtraLight, Regular, Medium,
// SemiBold are linked — see android/app/src/main/assets/fonts). `fonts.light` maps to
// Regular so h2/h3 headings render Regular instead of a missing weight.
export const fonts = { light: 'Poppins-Regular', regular: 'Poppins-Regular', medium: 'Poppins-Medium', semibold: 'Poppins-SemiBold', display: 'Poppins-ExtraLight' } as const;
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: 34 * 0.16 },
  h2: { fontFamily: fonts.light, fontSize: 26, lineHeight: 30, letterSpacing: 0.5 },
  h3: { fontFamily: fonts.light, fontSize: 20, lineHeight: 24, letterSpacing: 0.4 },
  h4: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 11 * 0.22, textTransform: 'uppercase' as const },
  money: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  kpi: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
};
