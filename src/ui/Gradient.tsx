import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export type SurfaceProps = {
  /** Gradient stops, dark -> darkest. Always a colour *token* — these are
   * passed in by the caller from `theme.colors.heroStops` / `avatarStops`. */
  stops: readonly string[];
  /** Corner radius, drawn on the rect itself rather than by clipping the
   * parent: `overflow: 'hidden'` on the parent would clip its `boxShadow`. */
  radius?: number;
  /** Gradient origin, as an SVG percentage ('18%' etc.). */
  cx?: string;
  cy?: string;
  /** Gradient extent. */
  r?: string;
};

/**
 * A radial-gradient fill for a hero surface (`HeroTile`, `Card variant="hero"`,
 * `Avatar`, the login page). RN has no gradient of its own and the brief allows
 * no new dependency, so this is `react-native-svg` — already installed — drawing
 * one rounded rect behind the content.
 */
export function RadialSurface({ stops, radius = 0, cx = '25%', cy = '5%', r = '130%' }: SurfaceProps) {
  const id = 'gradRadial';
  return (
    // No `width`/`height` props: on Android a percentage there resolves against
    // the *parent's* box before this absolutely-positioned view has one, and the
    // gradient ends up narrower than the surface it is filling (seen on the
    // primary button). `absoluteFill` alone gives the svg its viewport, and the
    // rect's own percentages then follow it exactly.
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={r}>
          {stops.map((stop, i) => (
            <Stop key={stop + i} offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`} stopColor={stop} />
          ))}
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

/** The flat product-tile gradient (`--tile-bg`, a 140deg linear ramp). */
export function LinearSurface({ stops, radius = 0 }: SurfaceProps) {
  const id = 'gradLinear';
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="80%" y2="100%">
          {stops.map((stop, i) => (
            <Stop key={stop + i} offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`} stopColor={stop} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}
