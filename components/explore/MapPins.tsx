// VBR_PIN_POOL: map markers as a fixed pool of slots.
// Why: the 23 Oct crash (Viberyte 1.3.1 build 27) is an NSRangeException in RCTLegacyViewManagerInteropComponentView
// (insertObject:atIndex: 27 beyond bounds [0 .. 0]) while mounting. react-native-maps 1.20 runs through that legacy interop
// under the new architecture, and its markers are the only native children of the map, so they are the strong suspect.
// The pool mounts PIN_POOL markers once, in a fixed order with fixed keys, and never adds or removes one afterwards —
// new results only change what each slot shows. Empty slots are invisible, parked far away, and have no tap handler.
// Taps report the pin's identity key (never a list index), so a tap can't select a different venue after results change.
// Each slot re-renders only when what it shows changes, and redraws its bitmap (tracksViewChanges) only briefly then.
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

export const PIN_POOL = 80;
export const PARKED = { latitude: -84.9, longitude: 0 };
export type PinIn = { key: string; lat: number; lng: number; kind: 'place' | 'event'; label: string; name: string; gold: boolean };
type Styles = Record<string, any>;
const LOCAL = {
  wrap: { alignItems: 'center' as const },
  labelOff: { width: 0, height: 0, opacity: 0, overflow: 'hidden' as const },
  textOff: { fontSize: 1, lineHeight: 1, color: 'transparent' },
  off: { width: 1, height: 1, opacity: 0 },
};

// For tests: how many times slots rendered (kept tiny; only counts).
export const pinStats = { renders: 0 };

/** Index of the card a tapped pin points at, in the CURRENT results; -1 if that card is no longer there. */
export function indexForKey(cards: any[], key: string, keyOf: (x: any) => string): number {
  for (let i = 0; i < cards.length; i++) if (keyOf(cards[i]) === key) return i;
  return -1;
}

const samePin = (a: PinIn | null, b: PinIn | null) =>
  a === b || (!!a && !!b && a.key === b.key && a.lat === b.lat && a.lng === b.lng && a.kind === b.kind && a.label === b.label && a.name === b.name && a.gold === b.gold);

const PinSlot = React.memo(function PinSlot({ pin, sel, onPress, styles }: { slot: number; pin: PinIn | null; sel: boolean; onPress: (key: string) => void; styles: Styles }) {
  pinStats.renders += 1;
  const sig = pin ? `${pin.kind}|${pin.label}|${pin.name}|${pin.gold ? 1 : 0}|${sel ? 1 : 0}` : '';
  const [track, setTrack] = useState(true);
  useEffect(() => { setTrack(true); const t = setTimeout(() => setTrack(false), 500); return () => clearTimeout(t); }, [sig]);
  const on = pin != null;
  // VBR_PIN_SHAPE_V1: one fixed view tree for every state (empty / place / selected / event), never flattened.
  // Under the new architecture a marker whose children change shape (or get flattened away) can lose its custom view on iOS
  // and fall back to Apple's red default pin. Here only styles and text change, so the native view never changes shape.
  const isEv = on && pin!.kind === 'event';
  const showLabel = on && sel && !isEv;
  const body = !on ? LOCAL.off : isEv ? [styles.datePin, sel && styles.datePinSel] : sel ? styles.pinSel : [styles.pin, pin!.gold && styles.pinEv];
  return (
    <Marker
      coordinate={on ? { latitude: pin!.lat, longitude: pin!.lng } : PARKED}
      opacity={on ? 1 : 0}
      onPress={on ? () => onPress(pin!.key) : undefined}
      tracksViewChanges={track || sel} // VBR_SEL_PIN_TRACK: selected pin keeps drawing (label can finish layout)
      zIndex={sel ? 20 : on ? 1 : 0}
      anchor={{ x: 0.5, y: showLabel ? 0.86 : 0.5 }}
    >
      <View collapsable={false} style={LOCAL.wrap}>
        <View collapsable={false} style={showLabel ? styles.pinLabel : LOCAL.labelOff}>
          <Text style={showLabel ? styles.pinLabelText : LOCAL.textOff} numberOfLines={1}>{showLabel ? pin!.name : ''}</Text>
        </View>
        <View collapsable={false} style={body}>
          <Text style={isEv ? [styles.datePinText, sel && styles.datePinTextSel] : LOCAL.textOff} numberOfLines={1}>{isEv ? pin!.label : ''}</Text>
        </View>
      </View>
    </Marker>
  );
}, (a, b) => a.sel === b.sel && a.onPress === b.onPress && a.styles === b.styles && samePin(a.pin, b.pin));

/** Always renders exactly PIN_POOL markers with keys pin-0 … pin-79, in that order. */
export function PinPool({ pins, selectedSlot, onPress, styles }: { pins: PinIn[]; selectedSlot: number; onPress: (key: string) => void; styles: Styles }) {
  const slots: React.ReactElement[] = [];
  for (let i = 0; i < PIN_POOL; i++) {
    const p = pins[i] || null;
    slots.push(<PinSlot key={`pin-${i}`} slot={i} pin={p} sel={!!p && selectedSlot === i} onPress={onPress} styles={styles} />);
  }
  return <>{slots}</>;
}
