// theme/editorial.ts — VBR_EDITORIAL_V1: the approved Viberyte visual system (see DESIGN.md).
// Screens adopt this one at a time. Nothing imports it globally, so adding it changes nothing on its own.
// Font: the iOS system font (SF Pro). No font migration until the native map build is validated.
import { StyleSheet, TextStyle } from 'react-native';

export const ink = {
  black: '#000000',      // page ground
  ground: '#0A0A0B',     // surfaces on black (cards, sheets)
  raise: '#161618',      // controls, image placeholders
  ivory: '#F3F0E9',      // primary text, primary button
  gray: 'rgba(243,240,233,0.62)',  // secondary text
  faint: 'rgba(243,240,233,0.40)', // tertiary text, placeholders
  line: 'rgba(243,240,233,0.10)',  // hairlines only
  gold: '#C5A36B',       // RARE: one meaning per screen (e.g. "has an event"). Never metadata, never decoration.
} as const;

// Type scale: strong hierarchy, few weights (400 / 600 / 700).
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1 } as TextStyle,   // editorial headline 36–42
  section: { fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.5 } as TextStyle, // section heading 25–28
  title:   { fontSize: 21, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 } as TextStyle, // venue / event title 21–24
  titleS:  { fontSize: 18, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 } as TextStyle, // compact cards
  body:    { fontSize: 16, lineHeight: 23, fontWeight: '400' } as TextStyle,                       // body 16–17
  detail:  { fontSize: 14, lineHeight: 19, fontWeight: '400' } as TextStyle,                       // supporting 13–14
  small:   { fontSize: 13, lineHeight: 17, fontWeight: '400' } as TextStyle,
  label:   { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' } as TextStyle, // editorial sections ONLY (TONIGHT, NEAR YOU)
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { control: 12, card: 16, pill: 999 } as const;
export const hair = StyleSheet.hairlineWidth;

// "cocktail_bar" → "Cocktail bar"
export const typeLabel = (t?: string | null) => {
  const s = String(t || '').replace(/_/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
};
