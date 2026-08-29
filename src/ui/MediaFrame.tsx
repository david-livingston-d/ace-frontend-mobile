import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { LinearSurface } from './Gradient';
import { controlRadius } from './tokens/radius';
import { MEDIA_RATIO } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type MediaFrameProps = {
  uri?: string;
  /** Request headers for `uri` — product images live behind the API's
   * authenticated `/files/{key}` endpoint, so the bearer rides along on the
   * image request itself (see `src/native/images.ts`). */
  headers?: Record<string, string>;
  /** Shown when there is no image — the product's own initials, never a
   * stock illustration. */
  initials: string;
  /** Width : height. Defaults to the mockup's 5:4 (`.mf`), which is what puts
   * four products above the floating cart badge in a 2-column grid. */
  ratio?: number;
};

/** The product image frame: a rounded tile that is a gradient placeholder
 * until an image loads, so a grid never jumps as pictures arrive. */
export function MediaFrame({ uri, headers, initials, ratio = MEDIA_RATIO }: MediaFrameProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.frame,
        { aspectRatio: ratio, borderRadius: controlRadius.tile, backgroundColor: theme.colors.sunken },
        shadow('highlight', theme.mode),
      ]}
    >
      <LinearSurface stops={theme.colors.tileStops} radius={controlRadius.tile} />
      {uri ? (
        <Image
          source={{ uri, headers }}
          accessibilityIgnoresInvertColors
          style={[StyleSheet.absoluteFill, { borderRadius: controlRadius.tile }]}
          resizeMode="cover"
        />
      ) : (
        <Text variant="label" color="muted">{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
